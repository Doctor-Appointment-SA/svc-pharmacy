import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type UiRxItem = {
    medicine_id: string;
    qty: number;
    note?: string; // your schema has no item note; keeping for UI compatibility
};

type UiRx = {
    id: string;
    doctor_id: string;
    patient_id: string;
    note?: string; // your schema has no prescription note; keeping for UI compatibility
    status: string;
    total: number;
    createdAt?: string;
    items: UiRxItem[];
};

@Injectable()
export class PrescriptionService {
    constructor(private prisma: PrismaService) { }

    /** Map DB prescription -> UI shape expected by your React page */
    private mapPrescriptionToUi(rx: any): UiRx {
        const items: UiRxItem[] = rx.prescription_item.map((it: any) => ({
            medicine_id: it.medication_id ?? '',
            qty: it.amount ?? 0,
            // If you later add an item note field, map it here.
            // Using medication.description as a fallback is optional:
            // note: it.medication?.description ?? undefined,
        }));

        const total = rx.prescription_item.reduce((sum: number, it: any) => {
            const price = typeof it.medication?.price === 'number' ? it.medication.price : 0;
            const qty = it.amount ?? 0;
            return sum + price * qty;
        }, 0);

        return {
            id: rx.id,
            doctor_id: rx.doctor_id ?? '',
            patient_id: rx.patient_id ?? '',
            note: undefined, // no field in your schema at prescription level
            status: rx.status ?? 'ready',
            total,
            createdAt: rx.created_at ? new Date(rx.created_at).toISOString() : undefined,
            items,
        };
    }

    /** GET /api/pharmacy/medicines */
    async listMedicines() {
        const meds = await this.prisma.medication.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true, strength: true, unit: true, price: true, description: true },
        });

        // UI expects { id, name, strength?, form?, unit?, price? }
        return meds.map((m) => ({
            id: m.id,
            name: m.name ?? undefined,
            strength: m.strength ?? undefined,
            form: m.description ?? undefined, // your UI shows this in the gray subline; optional
            unit: m.unit ?? undefined,
            price: typeof m.price === 'number' ? m.price : 0,
        }));
        // If you have a separate "form" column later, swap mapping.
    }

    /** GET /api/pharmacy/prescriptions/:id */
    async getById(id: string): Promise<UiRx> {
        const rx = await this.prisma.prescription.findUnique({
            where: { id },
            include: {
                prescription_item: { include: { medication: true } },
            },
        });
        if (!rx) throw new NotFoundException('Prescription not found');
        return this.mapPrescriptionToUi(rx);
    }

    /** PATCH /api/pharmacy/prescriptions/:id/status */
    async updateStatus(id: string, status: string) {
        const allowed = new Set(['ready', 'awaiting_payment', 'paid', 'cancelled']);
        if (!allowed.has(status)) throw new BadRequestException('Invalid status');

        const exists = await this.prisma.prescription.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('Prescription not found');

        await this.prisma.prescription.update({
            where: { id },
            data: { status },
        });

        return { ok: true, id, status };
    }

    /** GET /api/pharmacy/patients/:patientId/prescriptions/latest */
    async getLatestForPatient(patientId: string): Promise<UiRx> {
        const rx = await this.prisma.prescription.findFirst({
            where: { patient_id: patientId },
            orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
            include: {
                prescription_item: { include: { medication: true } },
            },
        });
        if (!rx) throw new NotFoundException('No prescription for this patient');
        return this.mapPrescriptionToUi(rx);
    }

    /** GET /api/pharmacy/patients/:patientId/prescriptions?limit=10 */
    async listForPatient(patientId: string, limit = 10) {
        const rows = await this.prisma.prescription.findMany({
            where: { patient_id: patientId },
            orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
            take: limit,
            include: {
                prescription_item: { include: { medication: true } },
            },
        });

        // Summaries for listing
        return rows.map((rx) => ({
            id: rx.id,
            status: rx.status ?? 'ready',
            createdAt: rx.created_at ? new Date(rx.created_at).toISOString() : undefined,
            total: rx.prescription_item.reduce((sum, it) => {
                const price = typeof it.medication?.price === 'number' ? it.medication.price : 0;
                return sum + price * (it.amount ?? 0);
            }, 0),
            itemsCount: rx.prescription_item.length,
        }));
    }
}

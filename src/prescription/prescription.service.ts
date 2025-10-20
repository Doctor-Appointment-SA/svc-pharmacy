import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type UiRxItemView = {
    medicine_id: string;
    qty: number;
    // enriched (if medication is included)
    name?: string;
    strength?: string;
    form?: string; // medication.description
    unit?: string;
    price?: number;
};

type UiRxView = {
    id: string;
    doctor_id: string;
    patient_id: string;

    // NEW for header/identity
    doctor_name?: string;
    doctor_lastname?: string;
    patient_name?: string;
    patient_lastname?: string;
    patient_username?: string;

    note?: string;
    status: string;
    total: number;
    createdAt?: string;
    items: UiRxItemView[];
};

@Injectable()
export class PrescriptionService {
    constructor(private prisma: PrismaService) { }

    /** Single place to shape the API response */
    private mapToView(rx: any): UiRxView {
        const items: UiRxItemView[] = (rx.prescription_item ?? []).map((it: any) => ({
            medicine_id: it.medication_id ?? '',
            qty: it.amount ?? 0,
            name: it.medication?.name ?? undefined,
            strength: it.medication?.strength ?? undefined,
            form: it.medication?.description ?? undefined,
            unit: it.medication?.unit ?? undefined,
            price: typeof it.medication?.price === 'number' ? it.medication.price : 0,
        }));

        const total = items.reduce(
            (sum, it) => sum + (it.price ?? 0) * (it.qty ?? 0),
            0,
        );

        // doctor.user (from doctor relation)
        const doctorUser = rx.doctor?.user;

        // patient -> user (two relations in your schema)
        const patientUserById = rx.patient?.user_patient_idTouser;
        const patientUserByHN = rx.patient?.user_patient_hospital_numberTouser;

        return {
            id: rx.id,
            doctor_id: rx.doctor_id ?? '',
            patient_id: rx.patient_id ?? '',

            // Names & username expected by the frontend
            doctor_name: doctorUser?.name ?? undefined,
            doctor_lastname: doctorUser?.lastname ?? undefined,
            patient_name: patientUserById?.name ?? undefined,
            patient_lastname: patientUserById?.lastname ?? undefined,
            patient_username:
                patientUserById?.username ?? patientUserByHN?.username ?? undefined,

            note: undefined, // map here if you later add a note column
            status: rx.status ?? 'ready',
            total,
            createdAt: rx.created_at ? new Date(rx.created_at).toISOString() : undefined,
            items,
        };
    }

    /** GET /pharmacy/prescriptions/:id (still available; used for other flows) */
    async getById(id: string): Promise<UiRxView> {
        const rx = await this.prisma.prescription.findUnique({
            where: { id },
            include: {
                prescription_item: { include: { medication: true } },
                doctor: { include: { user: true } },
                patient: {
                    include: {
                        user_patient_idTouser: true,
                        user_patient_hospital_numberTouser: true,
                    },
                },
            },
        });
        if (!rx) throw new NotFoundException('Prescription not found');
        return this.mapToView(rx);
        // If some other consumer needs the old "simple" shape, create a different mapper.
    }

    /** GET /pharmacy/patients/:patientId/prescriptions/latest  (used by your page) */
    async getLatestForPatient(patientId: string): Promise<UiRxView> {
        const rx = await this.prisma.prescription.findFirst({
            where: { patient_id: patientId },
            orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
            include: {
                prescription_item: { include: { medication: true } },
                doctor: { include: { user: true } },
                patient: {
                    include: {
                        user_patient_idTouser: true,
                        user_patient_hospital_numberTouser: true,
                    },
                },
            },
        });
        if (!rx) throw new NotFoundException('No prescription for this patient');
        return this.mapToView(rx);
    }

    /** PATCH /pharmacy/prescriptions/:id/status  */
    async updateStatus(id: string, status: string) {
        const allowed = new Set(['ready', 'awaiting_payment', 'paid', 'cancelled', 'unpaid']);
        if (!allowed.has(status)) {
            throw new BadRequestException('Invalid status');
        }

        const exists = await this.prisma.prescription.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('Prescription not found');

        await this.prisma.prescription.update({
            where: { id },
            data: { status },
        });
        return { ok: true, id, status };
    }

    /** GET /pharmacy/medicines  (for frontend enrichment) */
    async listMedicines() {
        const meds = await this.prisma.medication.findMany({
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                strength: true,
                unit: true,
                price: true,
                description: true,
            },
        });

        return meds.map((m) => ({
            id: m.id,
            name: m.name ?? undefined,
            strength: m.strength ?? undefined,
            form: m.description ?? undefined,
            unit: m.unit ?? undefined,
            price: typeof m.price === 'number' ? m.price : 0,
        }));
    }
}

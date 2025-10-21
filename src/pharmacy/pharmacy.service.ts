import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomUUID } from 'crypto';

/* ===== DTOs ===== */
type MedicineDto = {
    id: string;
    name: string;
    strength?: string;  // always returned as string
    form?: string;      // mapped from description
    unit?: string;      // enum as string
    price?: number;
};

type CreateRxItem = { medicine_id: string; qty: number };
type CreateRxInput = {
    doctor_id: string;
    patient_id: string;
    note?: string; // currently ignored (no DB column)
    items: CreateRxItem[];
};

@Injectable()
export class PharmacyService {
    constructor(private readonly prisma: PrismaService) { }

    /** GET /pharmacy/medicines */
    async getAllMedicines(): Promise<MedicineDto[]> {
        const meds = await this.prisma.medication.findMany({
            select: {
                id: true,
                name: true,
                description: true, // → form
                price: true,
                strength: true,    // number or string depending on schema; normalize below
                unit: true,        // enum
            },
            orderBy: { name: 'asc' },
        });

        return meds.map((m) => ({
            id: m.id,
            name: m.name ?? '',
            strength: m.strength != null ? String(m.strength) : undefined, // normalize to string
            form: m.description ?? undefined,
            unit: m.unit != null ? String(m.unit) : undefined,
            price: m.price ?? undefined,
        }));
    }

    /** POST /pharmacy/prescriptions */
    async createPrescription(input: CreateRxInput, user_id: string) {
        // --- Ownership check: patient must belong to current user ---
        const found = (input.doctor_id === user_id);
        if (!found) {
            throw new ForbiddenException('You do not own this prescription');
        }

        // --- Basic validation ---
        if (!input?.doctor_id || !input?.patient_id) {
            return { ok: false, message: 'doctor_id and patient_id are required' };
        }
        if (!Array.isArray(input.items) || input.items.length === 0) {
            return { ok: false, message: 'items must be a non-empty array' };
        }

        // --- Validate meds exist & qty > 0 ---
        const medIds = input.items.map((i) => i.medicine_id);
        const meds = await this.prisma.medication.findMany({
            where: { id: { in: medIds } },
            select: { id: true },
        });
        const known = new Set(meds.map((m) => m.id));
        const bad = input.items.find(
            (i) => !known.has(i.medicine_id) || !Number.isFinite(i.qty) || i.qty <= 0,
        );
        if (bad) return { ok: false, message: 'invalid item(s)' };

        // --- Persist prescription + items ---
        const rxId = randomUUID(); // remove if DB auto-generates

        await this.prisma.prescription.create({
            data: {
                id: rxId,
                patient_id: input.patient_id,
                doctor_id: input.doctor_id,
                status: 'ready',
                created_at: new Date(), // remove if column has default(now())
                prescription_item: {
                    create: input.items.map((i) => ({
                        id: randomUUID(),            // remove if table auto-generates
                        medication_id: i.medicine_id,
                        amount: i.qty,               // qty → amount
                    })),
                },
            },
        });

        return { ok: true, id: rxId };
    }

    /** GET /pharmacy/prescriptions */
    async listPrescriptions() {
        const rows = await this.prisma.prescription.findMany({
            orderBy: { created_at: 'desc' },
            select: {
                id: true,
                doctor_id: true,
                patient_id: true,
                status: true,
                created_at: true,
            },
        });

        return rows.map((r) => ({
            id: r.id,
            doctor_id: r.doctor_id ?? '',
            patient_id: r.patient_id ?? '',
            status: r.status ?? '',
            createdAt: r.created_at ?? null,
        }));
    }
}


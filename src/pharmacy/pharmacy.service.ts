import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomUUID } from 'crypto';

type Medicine = {
    id: string;
    name: string;
    strength?: string; // UI expects string; DB has Float?
    form?: string;     // we'll map from description
    unit?: string;     // enum value from DB
    stock?: number;    // not in DB (omit)
    price?: number;
};

type RxItem = { medicine_id: string; qty: number; note?: string };

type inputType = {
    doctor_id: string;
    patient_id: string;
    note?: string;        // your DB doesn't have prescription.note => ignored unless you add column
    items: RxItem[];
};

@Injectable()
export class PharmacyService {
    constructor(private readonly prisma: PrismaService) { }

    /** Read medicines from DB (medication) and map to UI shape */
    async getAllMedicines(): Promise<Medicine[]> {
        const meds = await this.prisma.medication.findMany({
            select: {
                id: true,
                name: true,
                description: true, // map → form
                price: true,
                strength: true,    // Float?
                unit: true,        // enum UnitMethod?
            },
            orderBy: { name: 'asc' },
        });

        return meds.map((m) => ({
            id: m.id,
            name: m.name ?? '',
            strength: m.strength != null ? String(m.strength) : undefined,
            form: m.description ?? undefined,
            unit: (m as any).unit ?? undefined, // enum comes as string
            price: m.price ?? undefined,
            // stock: not in schema
        }));
    }

    /**
     * Create prescription + items in DB.
     * Keeps your patient-ownership check via user_id.
     */
    async createPrescription(input: inputType, user_id: string) {
        // Ownership check: patient belongs to this user
        const found = await this.prisma.patient.findFirst({
            where: { id: input.patient_id, user_patient_idTouser: { id: user_id } },
            select: { id: true },
        });
        if (!found) {
            throw new ForbiddenException('You do not own this prescription');
        }

        if (!input?.doctor_id || !input?.patient_id) {
            return { ok: false, message: 'doctor_id and patient_id are required' };
        }
        if (!Array.isArray(input.items) || input.items.length === 0) {
            return { ok: false, message: 'items must be a non-empty array' };
        }

        // Validate medication IDs and qty
        const medIds = input.items.map((i) => i.medicine_id);
        const meds = await this.prisma.medication.findMany({
            where: { id: { in: medIds } },
            select: { id: true, price: true },
        });
        const known = new Set(meds.map((m) => m.id));
        const bad = input.items.find(
            (i) => !known.has(i.medicine_id) || !Number.isFinite(i.qty) || i.qty <= 0,
        );
        if (bad) return { ok: false, message: 'invalid item(s)' };

        // If your DB does NOT auto-generate UUIDs, generate them in app:
        const rxId = randomUUID();

        await this.prisma.prescription.create({
            data: {
                id: rxId,
                patient_id: input.patient_id,
                doctor_id: input.doctor_id,
                status: 'ready',        // stays as string (your schema allows)
                created_at: new Date(), // omit if column default exists
                prescription_item: {
                    create: input.items.map((i) => ({
                        id: randomUUID(),         // if your table requires explicit UUID
                        medication_id: i.medicine_id,
                        amount: i.qty,            // qty → amount
                    })),
                },
            },
        });

        return { ok: true, id: rxId };
    }

    /** Optional: list prescriptions (from DB instead of in-memory) */
    async listPrescriptions() {
        const rows = await this.prisma.prescription.findMany({
            orderBy: { created_at: 'desc' },
            select: { id: true, doctor_id: true, patient_id: true, status: true, created_at: true },
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

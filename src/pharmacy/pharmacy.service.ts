import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

type Medicine = {
  id: string;
  name: string;
  strength?: string;
  form?: string;
  unit?: string;
  stock?: number;
  price?: number;
};

type RxItem = { medicine_id: string; qty: number; note?: string };
type Prescription = {
  id: string;
  doctor_id: string;
  patient_id: string;
  note?: string;
  items: RxItem[];
  createdAt: Date;
};

// In-memory demo data
const MEDS: Medicine[] = [
  { id: 'med_paracetamol_500', name: 'Paracetamol', strength: '500 mg', form: 'tablet', unit: 'tab', stock: 320, price: 2.5 },
  { id: 'med_ibuprofen_200',  name: 'Ibuprofen',   strength: '200 mg', form: 'tablet', unit: 'tab', stock: 180, price: 3.0 },
  { id: 'med_amoxicillin_500',name: 'Amoxicillin', strength: '500 mg', form: 'capsule',unit: 'cap', stock: 90,  price: 5.5 },
  { id: 'med_omeprazole_20',  name: 'Omeprazole',  strength: '20 mg',  form: 'capsule',unit: 'cap', stock: 60,  price: 7.0 },
  { id: 'med_cetirizine_10',  name: 'Cetirizine',  strength: '10 mg',  form: 'tablet', unit: 'tab', stock: 200, price: 2.0 },
  { id: 'med_dextromethorphan', name: 'Dextromethorphan', strength: '100 ml', form: 'syrup', unit: 'ml', stock: 1000, price: 0.03 },
];

const RX_STORE: Prescription[] = [];

type inputType = {
    doctor_id: string;
    patient_id: string;
    note?: string;
    items: RxItem[];
  }

@Injectable()
export class PharmacyService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  getAllMedicines() {
    return MEDS.slice().sort((a, b) => a.name.localeCompare(b.name));
  }

  async createPrescription(input: inputType, user_id: string) {
    // verify jwt
    const found = await this.prisma.patient.findFirst({
      where: { id: input.patient_id, user_patient_idTouser: { id: user_id } },
      select: { id: true },
    });
    if (!found)
      throw new ForbiddenException('You do not own this prescription');

    if (!input?.doctor_id || !input?.patient_id) {
      return { ok: false, message: 'doctor_id and patient_id are required' };
    }

    console.log("input", input, " user_id", user_id);
    
    if (!Array.isArray(input.items) || input.items.length === 0) {
      return { ok: false, message: 'items must be a non-empty array' };
    }

    const id = `rx_${Date.now()}`;
    const rx: Prescription = {
      id,
      doctor_id: String(input.doctor_id),
      patient_id: String(input.patient_id),
      note: input.note,
      items: input.items.map((i) => ({
        medicine_id: String(i.medicine_id),
        qty: Math.max(1, Number(i.qty) || 1),
        note: i.note,
      })),
      createdAt: new Date(),
    };

    RX_STORE.push(rx);
    return { ok: true, id };
  }

  listPrescriptions() {
    return RX_STORE.slice().reverse();
  }
}

import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PharmacyService } from './pharmacy.service';

@Controller('pharmacy')
export class PharmacyController {
  constructor(private readonly svc: PharmacyService) {}

  // NEW: mock doctor/patient context (no auth)
  @Get('context')
  getContext(
    @Query('doctor') doctorFromQuery?: string,
    @Query('patient') patientFromQuery?: string,
  ) {
    // Optionally accept ?doctor=...&patient=... to demo switching
    const doctor_id = doctorFromQuery || 'doc_demo';
    const patient_id = patientFromQuery || 'patient_001';
    return { doctor_id, patient_id };
  }

  @Get('medicines')
  getMeds() { return this.svc.getAllMedicines(); }

  @Post('prescriptions')
  create(@Body() body: any) {
    const result = this.svc.createPrescription(body);
    return result.ok ? result : { statusCode: 400, message: result.message };
  }

  @Get('prescriptions')
  list() { return this.svc.listPrescriptions(); }
}

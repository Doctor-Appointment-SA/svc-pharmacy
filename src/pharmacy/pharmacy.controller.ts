import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PharmacyService } from './pharmacy.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import type { Request } from 'express';

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

  @UseGuards(JwtAuthGuard)
  @Post('prescriptions')
  async create(@Body() body: any, @Req() req:Request) {
    const user:any = req.user;
    const user_id = user.id;
    const result = await this.svc.createPrescription(body, user_id);
    return result.ok ? result : { statusCode: 400, message: result.message };
  }

  @Get('prescriptions')
  list() { return this.svc.listPrescriptions(); }
}

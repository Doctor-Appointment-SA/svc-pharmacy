import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { PrescriptionService } from './prescription.service';

// If you have an auth guard you want to skip here until login is ready,
// you can annotate at class or handler level with a custom @Public() decorator,
// or remove guards from this controller for now.

@Controller('pharmacy')
export class PrescriptionController {
    constructor(private service: PrescriptionService) { }

    /** GET /api/pharmacy/medicines */
    @Get('medicines')
    listMedicines() {
        return this.service.listMedicines();
    }

    /** GET /api/pharmacy/prescriptions/:id */
    @Get('prescriptions/:id')
    getOne(@Param('id') id: string) {
        return this.service.getById(id);
    }

    /** PATCH /api/pharmacy/prescriptions/:id/status  { status } */
    @Patch('prescriptions/:id/status')
    patchStatus(
        @Param('id') id: string,
        @Body() body: { status?: string },
    ) {
        if (!body?.status) {
            // Let service throw a proper 400 for invalid values,
            // but short-circuit when undefined.
            throw new Error('Missing status');
        }
        return this.service.updateStatus(id, body.status);
    }

    /** GET /api/pharmacy/patients/:patientId/prescriptions/latest */
    @Get('patients/:patientId/prescriptions/latest')
    getLatestForPatient(@Param('patientId') patientId: string) {
        return this.service.getLatestForPatient(patientId);
    }

    /** GET /api/pharmacy/patients/:patientId/prescriptions?limit=10 */
    @Get('patients/:patientId/prescriptions')
    listForPatient(
        @Param('patientId') patientId: string,
        @Query('limit') limit?: string,
    ) {
        const n = Number.isFinite(Number(limit)) ? Number(limit) : 10;
        const clamped = Math.min(Math.max(n, 1), 100);
        return this.service.listForPatient(patientId, clamped);
    }
}

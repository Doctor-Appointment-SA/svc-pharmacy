import {
    BadRequestException,
    Controller,
    Get,
    Param,
    Patch,
    Body,
    ParseUUIDPipe,
} from '@nestjs/common';
import { PrescriptionService } from './prescription.service';

@Controller('pharmacy')
export class PrescriptionController {
    constructor(private service: PrescriptionService) { }

    /** Latest for a patient (this is what your page calls) */
    @Get('patients/:patientId/prescriptions/latest')
    getLatestForPatient(
        @Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string,
    ) {
        return this.service.getLatestForPatient(patientId);
    }

    /** (Optional) Get by Rx id (kept for completeness) */
    @Get('prescriptions/:id')
    getOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.service.getById(id);
    }

    /** Update status (still available for other flows) */
    @Patch('prescriptions/:id/status')
    patchStatus(
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @Body() body: { status?: string },
    ) {
        if (!body?.status) throw new BadRequestException('Missing status');
        return this.service.updateStatus(id, body.status);
    }

    /** Medicines list (frontend enrichment) */
    @Get('medicines')
    listMedicines() {
        return this.service.listMedicines();
    }
}

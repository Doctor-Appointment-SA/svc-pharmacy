import { IsIn, IsString } from 'class-validator';

export class UpdateStatusDto {
    @IsString()
    @IsIn(['ready', 'awaiting_payment', 'paid', 'cancelled'])
    status!: 'ready' | 'awaiting_payment' | 'paid' | 'cancelled';
}

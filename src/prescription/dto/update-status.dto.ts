
export class UpdateStatusDto {
    status!: 'ready' | 'awaiting_payment' | 'paid' | 'cancelled';
}

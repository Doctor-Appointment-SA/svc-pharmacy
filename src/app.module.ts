import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PharmacyModule } from './pharmacy/pharmacy.module';
import { AuthModule } from './auth/auth.module';
import { jwtConfig } from './config/jwt.config';
import { PrismaModule } from './prisma/prisma.module';
import { PrescriptionModule } from './prescription/prescription.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PharmacyModule,
    PrescriptionModule,
    ConfigModule.forRoot({ isGlobal: true, load: [jwtConfig] }),
    AuthModule,
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegistrationV2Service } from './registration/registration-v2.service';
import { FirebasePhoneRegistrationService } from './firebase/firebase-phone-registration.service';

const authService = { login: jest.fn<ReturnType<AuthService['login']>, Parameters<AuthService['login']>>() };
const registration = { start: jest.fn<ReturnType<RegistrationV2Service['start']>, Parameters<RegistrationV2Service['start']>>() };
const firebasePhone = { prepare: jest.fn<ReturnType<FirebasePhoneRegistrationService['prepare']>, Parameters<FirebasePhoneRegistrationService['prepare']>>() };

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: RegistrationV2Service, useValue: registration },
        { provide: FirebasePhoneRegistrationService, useValue: firebasePhone },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

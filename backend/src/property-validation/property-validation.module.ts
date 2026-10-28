import { Module } from '@nestjs/common';

import { CrossFieldRuleEngine } from './cross-field-rule.engine';
import { NumericRuleEngine } from './numeric-rule.engine';
import { PropertyValidationService } from './property-validation.service';

@Module({
  providers: [
    NumericRuleEngine,
    CrossFieldRuleEngine,
    PropertyValidationService,
  ],
  exports: [PropertyValidationService],
})
export class PropertyValidationModule {}

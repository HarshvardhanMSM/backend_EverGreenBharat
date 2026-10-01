import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from '../entities/system-setting.entity';
import { UpdateEconomyConfigDto } from '../dto/economy-config.dto';

const ECONOMY_CONFIG_KEY = 'economy_config';

export interface EconomyConfig {
  coinsPerUsd: number;
  withdrawalCommissionRate: number;
  minimumWithdrawalCoins: number;
  updatedAt?: Date;
}

const DEFAULT_ECONOMY_CONFIG: EconomyConfig = {
  coinsPerUsd: 100,
  withdrawalCommissionRate: 30,
  minimumWithdrawalCoins: 100,
};

@Injectable()
export class EconomyConfigService implements OnModuleInit {
  private readonly logger = new Logger(EconomyConfigService.name);

  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingRepo: Repository<SystemSetting>,
  ) {}

  async onModuleInit() {
    try {
      await this.settingRepo.query(`
        CREATE TABLE IF NOT EXISTS system_settings (
          key VARCHAR(100) PRIMARY KEY,
          value JSONB NOT NULL,
          "createdAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL,
          "updatedAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL
        );
      `);
    } catch (e: any) {
      this.logger.debug(`system_settings table check: ${e?.message}`);
    }
  }

  async getConfig(): Promise<EconomyConfig> {
    try {
      const setting = await this.settingRepo.findOne({
        where: { key: ECONOMY_CONFIG_KEY },
      });

      if (!setting || !setting.value) {
        return DEFAULT_ECONOMY_CONFIG;
      }

      return {
        ...DEFAULT_ECONOMY_CONFIG,
        ...setting.value,
        updatedAt: setting.updatedAt,
      };
    } catch (err: any) {
      this.logger.warn(
        `Failed to read economy config from DB, returning defaults: ${err?.message}`,
      );
      return DEFAULT_ECONOMY_CONFIG;
    }
  }

  async updateConfig(dto: UpdateEconomyConfigDto): Promise<EconomyConfig> {
    const current = await this.getConfig();

    const merged = {
      coinsPerUsd:
        dto.coinsPerUsd !== undefined ? dto.coinsPerUsd : current.coinsPerUsd,
      withdrawalCommissionRate:
        dto.withdrawalCommissionRate !== undefined
          ? dto.withdrawalCommissionRate
          : current.withdrawalCommissionRate,
      minimumWithdrawalCoins:
        dto.minimumWithdrawalCoins !== undefined
          ? dto.minimumWithdrawalCoins
          : current.minimumWithdrawalCoins,
    };

    let setting = await this.settingRepo.findOne({
      where: { key: ECONOMY_CONFIG_KEY },
    });

    if (!setting) {
      setting = this.settingRepo.create({
        key: ECONOMY_CONFIG_KEY,
        value: merged,
      });
    } else {
      setting.value = merged;
    }

    const saved = await this.settingRepo.save(setting);
    return {
      ...merged,
      updatedAt: saved.updatedAt,
    };
  }
}

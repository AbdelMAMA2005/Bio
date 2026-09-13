import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { Plant } from '../../entities/plant.entity';
import { Collection } from '../../entities/collection.entity';
import { IdentificationLog } from '../../entities/identification-log.entity';
import { Report } from '../../entities/report.entity';
import { Post } from '../../entities/posts.entity';
import { Comment } from '../../entities/comment.entity';
import { Story } from '../../entities/story.entity';
import { Quest } from '../../entities/quest.entity';
import { QuestProgress } from '../../entities/quest-progress.entity';
import { FeatureFlag } from '../../entities/feature-flag.entity';
import { AdminAuditLog } from '../../entities/admin-audit-log.entity';

import { PlantsModule } from '../plants/plants.module';
import { UserModule } from '../user/user.module';

import { AdminAuditService } from './admin-audit.service';
import { AdminStatsService } from './admin-stats.service';
import { AdminUsersService } from './admin-users.service';
import { AdminPlantsService } from './admin-plants.service';
import { AdminModerationService } from './admin-moderation.service';
import { AdminQuestsService } from './admin-quests.service';
import { AdminSettingsService } from './admin-settings.service';

import { AdminMeController } from './admin-me.controller';
import { AdminStatsController } from './admin-stats.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminPlantsController } from './admin-plants.controller';
import { AdminModerationController } from './admin-moderation.controller';
import { AdminQuestsController } from './admin-quests.controller';
import { AdminSettingsController } from './admin-settings.controller';

/**
 * Console admin — module autonome (voir ARCHITECTURE.md §3), réutilise PlantsModule
 * (CRUD déjà existant) et UserModule (softDelete RGPD déjà existant) plutôt que de
 * dupliquer leur logique métier. Toutes les routes sont sous /admin/*, protégées par
 * JwtAuthGuard + RoleGuard(+@Roles) — jamais accessibles à un 'membre' (voir
 * common/guards/role.guard.ts et les tests e2e test/admin.e2e-spec.ts).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Plant,
      Collection,
      IdentificationLog,
      Report,
      Post,
      Comment,
      Story,
      Quest,
      QuestProgress,
      FeatureFlag,
      AdminAuditLog,
    ]),
    PlantsModule,
    UserModule,
  ],
  controllers: [
    AdminMeController,
    AdminStatsController,
    AdminUsersController,
    AdminPlantsController,
    AdminModerationController,
    AdminQuestsController,
    AdminSettingsController,
  ],
  providers: [
    AdminAuditService,
    AdminStatsService,
    AdminUsersService,
    AdminPlantsService,
    AdminModerationService,
    AdminQuestsService,
    AdminSettingsService,
  ],
})
export class AdminModule {}

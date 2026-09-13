import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminAuditLog } from '../../entities/admin-audit-log.entity';
import type { AdminAuditLogEntry } from '@planai/shared';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';

/**
 * Journalise chaque action d'administration (qui, quoi, quand) — injecté par les autres
 * services admin. Best-effort côté appelant : une écriture de log qui échoue ne doit
 * jamais faire échouer l'action elle-même (voir usages), seulement être tracée.
 */
@Injectable()
export class AdminAuditService {
  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly auditRepo: Repository<AdminAuditLog>,
  ) {}

  async log(
    admin: AuthenticatedUser,
    action: string,
    cible?: string | null,
  ): Promise<void> {
    await this.auditRepo.save(
      this.auditRepo.create({
        adminId: admin.id,
        adminPseudo: admin.nomUtilisateur,
        action,
        cible: cible ?? null,
      }),
    );
  }

  async recent(limit = 20): Promise<AdminAuditLogEntry[]> {
    const logs = await this.auditRepo.find({
      order: { dateCreation: 'DESC' },
      take: limit,
    });
    return logs.map((l) => ({
      id: l.id,
      adminPseudo: l.adminPseudo,
      action: l.action,
      cible: l.cible,
      dateCreation: l.dateCreation.toISOString(),
    }));
  }
}

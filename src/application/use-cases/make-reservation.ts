import type { AppError } from "../errors.js";
import { err, ok, type Result } from "../result.js";
import type { Clock } from "../clock.js";
import type { NotificationPort } from "../notification-port.js";
import type { ReservationCodeGenerator } from "../reservation-code-generator.js";
import type { ReservationRepository } from "../reservation-repository.js";
import type { TableRepository } from "../table-repository.js";

import { PartySize } from "../../domain/party-size.js";
import { Reservation } from "../../domain/reservation.js";
import type { ReservationPolicy } from "../../domain/";
import type { TableAllocationStrategy } from "../../domain/allocation/table-allocation-strategy.js";

export interface MakeReservationInput {
  readonly customerName: string;
  readonly contactEmail: string;
  readonly partySize: number;
  readonly start: Date; // 预订开始时间；结束时间由 ReservationPolicy 按固定时长计算
}

export class MakeReservation {
  constructor(
    private readonly tables: TableRepository,
    private readonly reservations: ReservationRepository,
    private readonly strategy: TableAllocationStrategy, // BR-1，可替换（NFR-2）
    private readonly policy: ReservationPolicy, // BR-3
    private readonly codes: ReservationCodeGenerator,
    private readonly notifications: NotificationPort,
    private readonly clock: Clock,
  ) {}

  async execute(
    input: MakeReservationInput,
  ): Promise<Result<Reservation, AppError>> {
    // 1. 输入校验（API 层已用 zod 校验格式，这里保证用例自身也不依赖调用方）
    const details: string[] = [];
    if (input.customerName.trim() === "")
      details.push("customerName is required");
    if (input.contactEmail.trim() === "")
      details.push("contactEmail is required");

    const party = PartySize.create(input.partySize);
    if (!party.ok) details.push(party.error);

    if (details.length > 0 || !party.ok) {
      return err({ kind: "ValidationFailed", details });
    }

    // 2. BR-3：营业时间、提前预订窗口、固定时长（now 由 Clock 传入，Domain 不自己取时间）
    const slotResult = this.policy.createSlot(input.start, this.clock.now());
    if (!slotResult.ok) {
      return err({ kind: "InvalidTime", reason: slotResult.error });
    }
    const slot = slotResult.value;

    // 3. 找出该时段已被占用的桌子（只看 Confirmed，已取消的预订不占桌）
    const activeTables = await this.tables.listActive();
    const occupied = new Set<string>();
    for (const table of activeTables) {
      const existing = await this.reservations.listByTableAndRange(
        table.id,
        slot,
      );
      if (
        existing.some((r) => r.status === "Confirmed" && r.slot.overlaps(slot))
      ) {
        occupied.add(table.id);
      }
    }

    // 4. BR-1：分配策略返回排好序的候选桌（最佳匹配优先）
    const candidates = this.strategy.rankCandidates(
      activeTables,
      party.value,
      occupied,
    );

    // 5. BR-2：依次尝试 insert；数据库报告 Conflict（并发抢桌）就换下一张
    for (const table of candidates) {
      const reservation = Reservation.create({
        code: this.codes.generate(),
        contactEmail: input.contactEmail,
        customerName: input.customerName,
        partySize: party.value,
        tableId: table.id,
        slot,
      });

      const inserted = await this.reservations.insert(reservation);
      if (inserted.ok) {
        await this.notifySafely(reservation);
        return ok(reservation);
      }
      // inserted.error === "Conflict" -> 继续下一张候选桌
    }

    // 6. 没有候选桌，或所有候选桌都冲突
    return err({ kind: "NoTableAvailable" });
  }

  // 通知失败不应让已成功的预订变成失败（真实邮件不在范围内，这里只是保护）
  private async notifySafely(reservation: Reservation): Promise<void> {
    try {
      await this.notifications.reservationConfirmed(reservation);
    } catch (e) {
      console.error("notification failed", e);
    }
  }
}

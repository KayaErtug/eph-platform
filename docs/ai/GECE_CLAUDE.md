# GECE_CLAUDE – ilerleme

## EPH-42 (yerel; commit/deploy/sunucu/migration yok)
- [x] 1) Ofis uçlarında süper admin: `owned()` süper admini sahiplik şartından muaf tutuyor; dashboard tüm aktif ofisleri sahip yetkisiyle gösteriyor; görev, aktivite, tarama logu, başvuru kararı, yetkiler süper admine açık. office-profile.spec.ts güncellendi.
- [x] 2) EPH-06: projects.service.ts update/remove zaten süper admini geçiriyordu (değişiklik gerekmedi). messages.service.ts: yazma/okuma yetkisi zaten açıktı; kalan engeller (engelleme kontrolü, takım toplu mesajı) süper admin için kaldırıldı.
- [x] 3) DELETE /organization/offices/:id ve /teams/:id eklendi (pasifleştirme + AuditLog, yalnız SUPER_ADMIN). Mobil metinler "pasifleştir" olarak düzeltildi.
- [x] Doğrulama: build, jest (office/projects/messages/organization/auth), mobil typecheck → Exit 0.

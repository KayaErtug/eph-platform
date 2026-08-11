"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BellRing,
  Building2,
  CheckCircle2,
  ChevronDown,
  Link2,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type RouteKind = "crm" | "pool" | "network" | null;

type InterestOption = {
  id: string;
  customerId: string;
  customerName: string;
  title: string;
  city?: string | null;
  district?: string | null;
  updatedAt?: string | null;
  lastMatchedAt?: string | null;
};

type CustomerOption = {
  id: string;
  name: string;
  interests: InterestOption[];
};

type UnitOption = {
  id: string;
  label: string;
  price?: number | null;
  updatedAt?: string | null;
};

type PostOption = {
  id: string;
  title: string;
  userId?: string | null;
  updatedAt?: string | null;
};

type MatchResult = {
  unitId: string;
  projectName?: string | null;
  city?: string | null;
  district?: string | null;
  price?: number | null;
  roomCount?: string | null;
  area?: number | null;
  matchScore: number;
  matchReasons?: string[];
};

type CoordinationAlert = {
  type: string;
  entityId: string;
  title: string;
  message: string;
  updatedAt: string;
  action: string;
};

function getRouteKind(pathname: string): RouteKind {
  if (pathname === "/crm" || pathname.startsWith("/crm/")) return "crm";
  if (pathname === "/havuz" || pathname.startsWith("/havuz/")) return "pool";
  if (pathname === "/network" || pathname.startsWith("/network/")) {
    return "network";
  }
  return null;
}

function getErrorMessage(error: unknown) {
  const value = error as any;
  const message = value?.response?.data?.message;

  if (Array.isArray(message)) return message.join("\n");

  return (
    message ||
    value?.response?.data?.error ||
    value?.message ||
    "İşlem tamamlanamadı."
  );
}

function formatMoney(value?: number | null) {
  if (value == null || !Number.isFinite(Number(value))) return "";
  return `${Number(value).toLocaleString("tr-TR")} TL`;
}

function isInterestStale(interest?: InterestOption | null) {
  if (!interest) return false;
  if (!interest.lastMatchedAt) return true;
  if (!interest.updatedAt) return false;

  return (
    new Date(interest.updatedAt).getTime() >
    new Date(interest.lastMatchedAt).getTime()
  );
}

export default function EPHCoordinationDock() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const routeKind = getRouteKind(pathname || "");

  const [open, setOpen] = useState(false);
  const [showTriggerLabel, setShowTriggerLabel] = useState(true);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [alerts, setAlerts] = useState<CoordinationAlert[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [interests, setInterests] = useState<InterestOption[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [posts, setPosts] = useState<PostOption[]>([]);
  const [selectedInterestId, setSelectedInterestId] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedPostId, setSelectedPostId] = useState("");
  const [matches, setMatches] = useState<MatchResult[]>([]);

  const selectedInterest = useMemo(
    () => interests.find((item) => item.id === selectedInterestId) || null,
    [interests, selectedInterestId],
  );
  const selectedCustomer = useMemo(
    () => customers.find((item) => item.id === selectedCustomerId) || null,
    [customers, selectedCustomerId],
  );
  const selectedUnitMatch = useMemo(
    () => matches.find((item) => item.unitId === selectedUnitId) || null,
    [matches, selectedUnitId],
  );

  const refreshAlerts = useCallback(async () => {
    if (!user?.id || !routeKind) return;

    try {
      const response = await api.get("/coordination/alerts");
      setAlerts(Array.isArray(response.data?.alerts) ? response.data.alerts : []);
    } catch {
      setAlerts([]);
    }
  }, [routeKind, user?.id]);

  const normalizeCustomers = useCallback((value: unknown) => {
    const source = Array.isArray(value) ? value : [];
    const nextCustomers: CustomerOption[] = source.map((customer: any) => {
      const customerName = `${customer.firstName || ""} ${customer.lastName || ""}`.trim();
      const customerInterests: InterestOption[] = (
        Array.isArray(customer.interests) ? customer.interests : []
      )
        .filter((interest: any) => interest?.isActive !== false)
        .map((interest: any) => ({
          id: String(interest.id),
          customerId: String(customer.id),
          customerName,
          title:
            String(interest.title || "").trim() ||
            [interest.city, interest.district, "Gayrimenkul talebi"]
              .filter(Boolean)
              .join(" / "),
          city: interest.city || null,
          district: interest.district || null,
          updatedAt: interest.updatedAt || null,
          lastMatchedAt: interest.lastMatchedAt || null,
        }));

      return {
        id: String(customer.id),
        name: customerName || "CRM müşterisi",
        interests: customerInterests,
      };
    });

    setCustomers(nextCustomers);
    setInterests(nextCustomers.flatMap((customer) => customer.interests));
    return nextCustomers;
  }, []);

  const loadRouteData = useCallback(async () => {
    if (!user?.id || !routeKind) return;

    setLoading(true);
    setMessage("");
    setMatches([]);

    try {
      if (routeKind === "crm") {
        const response = await api.get("/crm/customers");
        const nextCustomers = normalizeCustomers(response.data);
        const firstInterest = nextCustomers.flatMap((item) => item.interests)[0];
        setSelectedInterestId((current) => current || firstInterest?.id || "");
      }

      if (routeKind === "pool") {
        const [unitsResponse, customersResponse] = await Promise.all([
          api.get("/units/pool"),
          api.get("/crm/customers"),
        ]);
        const nextCustomers = normalizeCustomers(customersResponse.data);
        const nextUnits: UnitOption[] = (
          Array.isArray(unitsResponse.data) ? unitsResponse.data : []
        ).map((unit: any) => ({
          id: String(unit.id),
          label:
            [
              unit.project?.name,
              unit.roomCount,
              unit.project?.district,
              unit.number ? `No ${unit.number}` : "",
            ]
              .filter(Boolean)
              .join(" · ") || `EPH-${String(unit.id).slice(0, 6).toUpperCase()}`,
          price: unit.price ?? null,
          updatedAt: unit.updatedAt || null,
        }));

        setUnits(nextUnits);
        setSelectedUnitId((current) => current || nextUnits[0]?.id || "");
        setSelectedCustomerId((current) => current || nextCustomers[0]?.id || "");
        setSelectedInterestId((current) => {
          if (current) return current;
          return nextCustomers[0]?.interests[0]?.id || "";
        });
      }

      if (routeKind === "network") {
        const response = await api.get("/network/posts");
        const nextPosts: PostOption[] = (
          Array.isArray(response.data) ? response.data : []
        ).map((post: any) => ({
          id: String(post.id),
          title: String(post.title || "Talep Merkezi kaydı"),
          userId: post.userId || null,
          updatedAt: post.updatedAt || null,
        }));

        const pathId = pathname.split("/").filter(Boolean)[1] || "";
        setPosts(nextPosts);
        setSelectedPostId((current) =>
          current ||
          (nextPosts.some((item) => item.id === pathId) ? pathId : "") ||
          nextPosts[0]?.id ||
          "",
        );
      }

      await refreshAlerts();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [normalizeCustomers, pathname, refreshAlerts, routeKind, user?.id]);

  useEffect(() => {
    if (!routeKind || !user?.id) return;
    refreshAlerts();

    const timer = window.setInterval(refreshAlerts, 60_000);
    return () => window.clearInterval(timer);
  }, [refreshAlerts, routeKind, user?.id]);

  useEffect(() => {
    if (!routeKind || open) return;

    setShowTriggerLabel(true);
    const timer = window.setTimeout(() => {
      setShowTriggerLabel(false);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [alerts.length, open, pathname, routeKind]);

  useEffect(() => {
    if (!open) return;
    loadRouteData();
  }, [loadRouteData, open, routeKind]);

  useEffect(() => {
    if (!selectedCustomer) return;
    const belongsToCustomer = selectedCustomer.interests.some(
      (interest) => interest.id === selectedInterestId,
    );
    if (!belongsToCustomer) {
      setSelectedInterestId(selectedCustomer.interests[0]?.id || "");
    }
  }, [selectedCustomer, selectedInterestId]);

  const recalculateInterest = async () => {
    if (!selectedInterestId) return;
    setBusy("recalculate-interest");
    setMessage("");

    try {
      const response = await api.post(
        `/coordination/crm/interests/${selectedInterestId}/recalculate`,
      );
      const nextMatches = Array.isArray(response.data?.matches)
        ? response.data.matches
        : [];
      setMatches(nextMatches);
      setInterests((current) =>
        current.map((item) =>
          item.id === selectedInterestId
            ? { ...item, lastMatchedAt: response.data?.recalculatedAt }
            : item,
        ),
      );
      setMessage(response.data?.warning || "Lina eşleşmeleri yeniledi.");
      await refreshAlerts();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setBusy("");
    }
  };

  const publishInterest = async () => {
    if (!selectedInterestId) return;
    if (
      !window.confirm(
        "CRM talebini müşteri adı, telefon ve e-posta paylaşmadan Talep Merkezi'nde yayınlamak istiyor musunuz?",
      )
    ) {
      return;
    }

    setBusy("publish-interest");
    setMessage("");

    try {
      const response = await api.post(
        `/coordination/crm/interests/${selectedInterestId}/publish-request`,
        { expiresInDays: 7 },
      );
      setMessage(
        response.data?.message || "CRM talebi Talep Merkezi'nde yayınlandı.",
      );
      await refreshAlerts();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setBusy("");
    }
  };

  const linkPoolUnit = async (unitId: string, match?: MatchResult | null) => {
    const customerId = selectedCustomerId || selectedInterest?.customerId;
    if (!customerId || !unitId) return;

    setBusy(`link-${unitId}`);
    setMessage("");

    try {
      const response = await api.post(
        `/coordination/crm/customers/${customerId}/pool-units/${unitId}/link`,
        {
          customerInterestId: selectedInterestId || undefined,
          matchScore: match?.matchScore,
          matchReasons: match?.matchReasons || [],
          note: "EPH Koordinasyon Paneli üzerinden bağlandı.",
          createFollowUpTask: false,
        },
      );
      setMessage(
        response.data?.message || "Havuz portföyü CRM müşterisine bağlandı.",
      );
      await refreshAlerts();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setBusy("");
    }
  };

  const recalculateRequest = async () => {
    if (!selectedPostId) return;
    setBusy("recalculate-request");
    setMessage("");

    try {
      const response = await api.post(
        `/coordination/requests/${selectedPostId}/recalculate-portfolio-matches`,
      );
      setMatches(
        Array.isArray(response.data?.matches) ? response.data.matches : [],
      );
      setMessage(response.data?.warning || "Lina portföyleri yeniden taradı.");
      await refreshAlerts();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setBusy("");
    }
  };

  const createCrmOpportunity = async () => {
    if (!selectedPostId) return;
    if (
      !window.confirm(
        "Bu Talep Merkezi kaydını telefon ve e-posta kopyalamadan özel CRM fırsatına dönüştürmek istiyor musunuz?",
      )
    ) {
      return;
    }

    setBusy("create-opportunity");
    setMessage("");

    try {
      const response = await api.post(
        `/coordination/requests/${selectedPostId}/create-crm-opportunity`,
      );
      setMessage(
        response.data?.message || "Talep özel CRM fırsatına dönüştürüldü.",
      );
      await refreshAlerts();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setBusy("");
    }
  };

  if (!routeKind || !user?.id) return null;

  const routeTitle =
    routeKind === "crm"
      ? "CRM Koordinasyonu"
      : routeKind === "pool"
        ? "Havuz Koordinasyonu"
        : "Talep Koordinasyonu";

  return (
    <div className="fixed bottom-[calc(82px+env(safe-area-inset-bottom,0px))] right-3 z-[90] sm:bottom-5 sm:right-5">
      {open ? (
        <section className="w-[min(92vw,390px)] overflow-hidden rounded-[24px] border border-[#6EA8E8] bg-[#061A33] text-white shadow-[0_24px_70px_rgba(2,14,33,0.48)]">
          <header className="flex items-center justify-between gap-3 border-b border-[#28527D] bg-gradient-to-r from-[#0B3158] to-[#0A2544] px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#82C8FF]">
                <Sparkles size={15} /> Lina
              </div>
              <h2 className="truncate text-base font-black">{routeTitle}</h2>
            </div>
            <div className="flex items-center gap-2">
              {alerts.length > 0 && (
                <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-amber-400 px-2 text-xs font-black text-[#3A2208]">
                  {alerts.length}
                </span>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#3C6B96] bg-[#0D3A63]"
                aria-label="Koordinasyon panelini kapat"
              >
                <X size={18} />
              </button>
            </div>
          </header>

          <div className="max-h-[min(70dvh,620px)] space-y-3 overflow-y-auto p-3">
            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-[#0B2A49] p-8 text-sm font-bold text-[#B9D7F0]">
                <Loader2 className="animate-spin" size={18} /> Veriler hazırlanıyor
              </div>
            ) : (
              <>
                {alerts.length > 0 && (
                  <div className="rounded-2xl border border-amber-400/50 bg-amber-400/10 p-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-black text-amber-200">
                      <BellRing size={17} /> Lina uyarıları
                    </div>
                    <div className="space-y-2">
                      {alerts.slice(0, 3).map((alert) => (
                        <div
                          key={`${alert.type}-${alert.entityId}`}
                          className="rounded-xl bg-[#102F4E] px-3 py-2"
                        >
                          <p className="text-xs font-black text-white">{alert.title}</p>
                          <p className="mt-1 text-[11px] leading-4 text-[#B8D0E5]">
                            {alert.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {routeKind === "crm" && (
                  <div className="space-y-3">
                    <SelectField
                      label="CRM talebi"
                      value={selectedInterestId}
                      onChange={setSelectedInterestId}
                      options={interests.map((interest) => ({
                        value: interest.id,
                        label: `${interest.customerName} · ${interest.title}`,
                      }))}
                    />

                    {selectedInterest && isInterestStale(selectedInterest) && (
                      <WarningCard text="Bu talep son taramadan sonra değişti. Lina eşleşmeleri yeniden hesaplamalı." />
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <ActionButton
                        icon={<RefreshCw size={16} />}
                        label="Havuzu Tara"
                        busy={busy === "recalculate-interest"}
                        disabled={!selectedInterestId}
                        onClick={recalculateInterest}
                      />
                      <ActionButton
                        icon={<Send size={16} />}
                        label="Talepte Yayınla"
                        busy={busy === "publish-interest"}
                        disabled={!selectedInterestId}
                        onClick={publishInterest}
                      />
                    </div>
                  </div>
                )}

                {routeKind === "pool" && (
                  <div className="space-y-3">
                    <SelectField
                      label="Havuz portföyü"
                      value={selectedUnitId}
                      onChange={setSelectedUnitId}
                      options={units.map((unit) => ({
                        value: unit.id,
                        label: `${unit.label}${unit.price ? ` · ${formatMoney(unit.price)}` : ""}`,
                      }))}
                    />
                    <SelectField
                      label="CRM müşterisi"
                      value={selectedCustomerId}
                      onChange={setSelectedCustomerId}
                      options={customers.map((customer) => ({
                        value: customer.id,
                        label: customer.name,
                      }))}
                    />
                    <SelectField
                      label="Talep profili"
                      value={selectedInterestId}
                      onChange={setSelectedInterestId}
                      options={(selectedCustomer?.interests || []).map((interest) => ({
                        value: interest.id,
                        label: interest.title,
                      }))}
                      optionalLabel="Talep profili olmadan bağla"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <ActionButton
                        icon={<RefreshCw size={16} />}
                        label="Puanı Hesapla"
                        busy={busy === "recalculate-interest"}
                        disabled={!selectedInterestId}
                        onClick={recalculateInterest}
                      />
                      <ActionButton
                        icon={<Link2 size={16} />}
                        label="CRM'ye Bağla"
                        busy={busy === `link-${selectedUnitId}`}
                        disabled={!selectedCustomerId || !selectedUnitId}
                        onClick={() => linkPoolUnit(selectedUnitId, selectedUnitMatch)}
                      />
                    </div>
                  </div>
                )}

                {routeKind === "network" && (
                  <div className="space-y-3">
                    <SelectField
                      label="Talep Merkezi kaydı"
                      value={selectedPostId}
                      onChange={setSelectedPostId}
                      options={posts.map((post) => ({
                        value: post.id,
                        label: post.title,
                      }))}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <ActionButton
                        icon={<Building2 size={16} />}
                        label="Portföylerimle Eşleştir"
                        busy={busy === "recalculate-request"}
                        disabled={!selectedPostId}
                        onClick={recalculateRequest}
                      />
                      <ActionButton
                        icon={<UsersRound size={16} />}
                        label="CRM Fırsatı Oluştur"
                        busy={busy === "create-opportunity"}
                        disabled={!selectedPostId}
                        onClick={createCrmOpportunity}
                      />
                    </div>
                  </div>
                )}

                {message && (
                  <div className="rounded-2xl border border-[#3C76A8] bg-[#0D3559] px-3 py-3 text-xs font-bold leading-5 text-[#D9EDFF]">
                    {message}
                  </div>
                )}

                {matches.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black uppercase tracking-[0.1em] text-[#8CCBFF]">
                        Güncel eşleşmeler
                      </p>
                      <span className="text-xs font-bold text-[#A9C7DF]">
                        {matches.length} sonuç
                      </span>
                    </div>
                    {matches.slice(0, 5).map((match) => (
                      <div
                        key={match.unitId}
                        className="rounded-2xl border border-[#2E5F89] bg-[#0A2948] p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black">
                              {match.projectName || `EPH-${match.unitId.slice(0, 6)}`}
                            </p>
                            <p className="mt-1 text-[11px] text-[#AFC9DF]">
                              {[match.city, match.district, match.roomCount]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                            {match.price != null && (
                              <p className="mt-1 text-xs font-black text-[#8FD0FF]">
                                {formatMoney(match.price)}
                              </p>
                            )}
                          </div>
                          <span className="rounded-xl bg-emerald-400 px-2.5 py-1 text-sm font-black text-[#053322]">
                            %{match.matchScore}
                          </span>
                        </div>
                        {routeKind === "crm" && selectedInterest && (
                          <button
                            type="button"
                            disabled={busy === `link-${match.unitId}`}
                            onClick={() => linkPoolUnit(match.unitId, match)}
                            className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-[#1C75C9] text-xs font-black disabled:opacity-50"
                          >
                            {busy === `link-${match.unitId}` ? (
                              <Loader2 className="animate-spin" size={15} />
                            ) : (
                              <Link2 size={15} />
                            )}
                            Müşteriye bağla
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      ) : (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`relative flex items-center justify-center gap-2 rounded-full border border-[#78B9F1] bg-gradient-to-r from-[#08284A] to-[#0C4D82] text-sm font-black text-white shadow-[0_12px_28px_rgba(5,35,68,0.34)] transition-all ${
              showTriggerLabel ? "h-12 px-4" : "h-11 w-11 px-0"
            }`}
            aria-label="Lina Eşleştirme panelini aç"
            title="Lina Eşleştirme"
          >
            <Sparkles size={18} className="shrink-0 text-[#8DD3FF]" />
            {showTriggerLabel && <span>Lina Eşleştirme</span>}
            {alerts.length > 0 && (
              <span className="absolute -right-1 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-amber-400 px-1 text-[11px] font-black text-[#3A2208]">
                {alerts.length}
              </span>
            )}
          </button>

          {showTriggerLabel && (
            <button
              type="button"
              onClick={() => setShowTriggerLabel(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#C7D6E8] bg-white text-[#52657A] shadow-[0_8px_20px_rgba(15,23,42,0.16)]"
              aria-label="Lina Eşleştirme bildirimini küçült"
              title="Küçült"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  optionalLabel,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  optionalLabel?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-black uppercase tracking-[0.08em] text-[#94C8F1]">
        {label}
      </span>
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full appearance-none rounded-xl border border-[#3D6F99] bg-[#0A2C4D] px-3 pr-9 text-xs font-bold text-white outline-none focus:border-[#78C5FF]"
        >
          {optionalLabel && <option value="">{optionalLabel}</option>}
          {!optionalLabel && options.length === 0 && (
            <option value="">Kayıt bulunamadı</option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-3.5 text-[#8FC8F4]"
        />
      </span>
    </label>
  );
}

function ActionButton({
  icon,
  label,
  busy,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#4B86B8] bg-gradient-to-b from-[#155E99] to-[#0D4776] px-2 text-center text-[11px] font-black leading-4 text-white disabled:cursor-not-allowed disabled:opacity-45"
    >
      {busy ? <Loader2 className="animate-spin" size={16} /> : icon}
      {label}
    </button>
  );
}

function WarningCard({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-400/50 bg-amber-400/10 px-3 py-2 text-[11px] font-bold leading-4 text-amber-100">
      <BellRing className="mt-0.5 shrink-0" size={15} />
      {text}
    </div>
  );
}

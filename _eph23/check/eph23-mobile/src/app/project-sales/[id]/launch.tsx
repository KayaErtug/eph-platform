import PoolAudienceModal, { type PoolAudienceValue } from '../../../components/PoolAudienceModal';
import { pkText, useTariff } from '../../../lib/tariff';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEphDialog } from '../../../components/EphDialogProvider';
import NativeHeader from '../../../components/NativeHeader';
import ScreenState from '../../../components/ScreenState';
import { api, getApiErrorMessage } from '../../../lib/api';
import { EPH } from '../../../lib/theme';
import { PrimaryButton, SecondaryButton } from '../../../projectSales/ui';
import ProjectStepNav from '../../../projectSales/ProjectStepNav';

type Completion = {
  ready: boolean;
  issues: Array<{ code: string; message: string }>;
  summary?: Record<string, unknown>;
  latestDesignReview?: any;
};

type CheckItem = {
  key: string;
  label: string;
  passed: boolean;
  detail?: string;
};

type Launch = {
  project?: {
    id?: string;
    name?: string;
    code?: string;
    setupStatus?: string;
    inPool?: boolean;
  };
  publishReadiness?: {
    ready: boolean;
    issues?: Array<{ code?: string; message?: string }>;
    checks?: CheckItem[];
    nextAction?: string;
    warning?: string;
  };
  presentation?: any;
  renderBrief?: any;
};

export default function ProjectLaunch() {
  const { cost } = useTariff();
  const dialog = useEphDialog();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [launch, setLaunch] = useState<Launch | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [audienceOpen, setAudienceOpen] = useState(false);

  const load = async () => {
    if (!id) return;

    try {
      setLoading(true);

      const [c, l] = await Promise.all([
        api.get<Completion>(`/project-sales/projects/${id}/completion-preview`),
        api.get<Launch>(`/project-sales/projects/${id}/launch`),
      ]);

      setCompletion(c);
      setLaunch(l);
      // EPH-22: Eksik yoksa kurulum otomatik tamamlanır; "Proje Kurulumunu Tamamla" butonuna basmak gerekmez.
      if ((c as any)?.ready && l?.project?.setupStatus !== 'TAMAMLANDI') {
        try {
          await api.post(`/project-sales/projects/${id}/complete`);
          setLaunch(await api.get<Launch>(`/project-sales/projects/${id}/launch`));
        } catch {
          // buton görünür kalır, kullanıcı elle dener
        }
      }
    } catch (e) {
      await dialog.error({
        title: 'Hata',
        message: getApiErrorMessage(e),
        primaryLabel: 'Tamam',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <NativeHeader title="Son Kontrol ve Yayın" />
        <ScreenState loading message="Proje kontrol ediliyor..." />
      </SafeAreaView>
    );
  }

  const isSetupCompleted = launch?.project?.setupStatus === 'TAMAMLANDI';
  const isPublishReady = Boolean(launch?.publishReadiness?.ready && isSetupCompleted);

  const complete = async () => {
    try {
      setBusy('complete');

      await api.post(`/project-sales/projects/${id}/complete`);

      await load();

      await dialog.success({
        eyebrow: 'PROJE SATIŞ MERKEZİ',
        title: 'Tamamlandı',
        message: 'Proje kurulumu tamamlandı.',
        primaryLabel: 'Tamam',
      });
    } catch (e) {
      await dialog.error({
        title: 'Tamamlanamadı',
        message: getApiErrorMessage(e),
        primaryLabel: 'Tamam',
      });
    } finally {
      setBusy('');
    }
  };

  const render = async () => {
    try {
      setBusy('render');

      const result = await api.post<any>(
        `/project-sales/projects/${id}/launch/render-work-order`
      );

      await dialog.success({
        eyebrow: 'RENDER İŞ EMRİ',
        title: 'Render Brief Hazır',
        message: `İş emri: ${result?.id || 'oluşturuldu'}\n${result?.nextAction || ''}`,
        primaryLabel: 'Tamam',
      });
    } catch (e) {
      await dialog.error({
        title: 'Render İş Emri',
        message: getApiErrorMessage(e),
        primaryLabel: 'Tamam',
      });
    } finally {
      setBusy('');
    }
  };

  const presentation = async () => {
    if (!isSetupCompleted || busy) return;

    try {
      setBusy('presentation');

      const result = await api.post<any>(
        `/project-sales/projects/${id}/launch/presentation-link`
      );

      const url = String(result?.url || '');

      if (!url) {
        throw new Error('Sunum bağlantısı oluşturulamadı.');
      }

      await Share.share({
        title: `${launch?.project?.name || 'EPH'} Proje Sunumu`,
        message: `${launch?.project?.name || 'EPH Projesi'}\n${url}`,
        url,
      });
    } catch (e) {
      await dialog.error({
        title: 'Sunum Bağlantısı',
        message: getApiErrorMessage(e),
        primaryLabel: 'Tamam',
      });
    } finally {
      setBusy('');
    }
  };

  const publish = async (poolAudience: PoolAudienceValue) => {
    if (!isPublishReady || busy) return;

    const approved = await dialog.confirm({
      eyebrow: 'HAVUZ YAYINI',
      title: 'Havuza Yayınla',
      message: `Satış stokundaki aktif bağımsız bölümler Havuzda yayınlanacak. Proje havuzda değilse tek seferlik ${pkText(
        cost('COST_PROJE_HAVUZ')
      )} kesilir; bölümler için ayrıca ücret alınmaz. Proje havuzda kaldığı sürece tekrar ücret alınmaz. Devam edilsin mi?`,
      primaryLabel: 'Yayınla',
      secondaryLabel: 'Vazgeç',
    });

    if (!approved) return;

    try {
      setBusy('publish');

      const [offices, wallets] = await Promise.all([
        api.get<{ id: string }[]>('/office/mine'),
        api.get<{ options: { walletSource: string; walletOfficeId?: string }[] }>('/office/wallet-options'),
      ]);
      const option = (offices.length ? wallets.options.find(o => o.walletSource === 'OFFICE') : null) ?? wallets.options[0];
      const wallet = option ? { walletSource: option.walletSource, walletOfficeId: option.walletOfficeId } : {};
      const result = await api.post<any>(
        `/project-sales/projects/${id}/launch/publish-to-pool`,
        { poolAudience, ...wallet }
      );

      setAudienceOpen(false);
      await load();

      await dialog.success({
        eyebrow: 'HAVUZ YAYINI',
        title: 'Yayınlandı',
        message: `${Number(result?.publishedUnitCount || 0)} bağımsız bölüm Havuzda yayınlandı.`,
        primaryLabel: 'Tamam',
      });
    } catch (e) {
      await dialog.error({
        title: 'Yayınlanamadı',
        message: getApiErrorMessage(e),
        primaryLabel: 'Tamam',
      });
    } finally {
      setBusy('');
    }
  };

  const withdraw = async () => {
    if (busy) return;
    if (
      !(await dialog.confirm({
        title: 'Havuzdan Geri Çek',
        message: 'Bu projenin Havuzdaki bölümleri gizlenecek; proje ve fotoğraflar silinmez.',
        primaryLabel: 'Geri Çek',
        secondaryLabel: 'Vazgeç',
      }))
    )
      return;
    setBusy('withdraw');
    try {
      const result = await api.post<{ withdrawnUnitCount: number }>(
        `/project-sales/projects/${id}/launch/withdraw-from-pool`
      );
      await load();
      await dialog.success({
        title: 'Havuzdan Geri Çekildi',
        message: `${result.withdrawnUnitCount} bölüm Havuzdan kaldırıldı.`,
        primaryLabel: 'Tamam',
      });
    } catch (error) {
      await dialog.error({
        title: 'İşlem Tamamlanamadı',
        message: getApiErrorMessage(error),
        primaryLabel: 'Tamam',
      });
    } finally {
      setBusy('');
    }
  };

  const navigateToCheck = (key: string) => {
    if (!id) return;
    switch (key) {
      case 'project_completed':
        if (completion?.issues && completion.issues.length > 0) {
          const firstCode = completion.issues[0]?.code;
          handleCompletionIssueNavigation(firstCode);
          return;
        }
        router.push(`/project-sales/${id}/setup` as never);
        break;
      case 'sales_stock_exists':
      case 'prices_entered':
      case 'active_stock_available':
        router.push(`/project-sales/${id}/stock` as never);
        break;
      case 'media_uploaded':
        router.push(`/project-sales/${id}/media` as never);
        break;
      default:
        router.push(`/project-sales/${id}/setup` as never);
        break;
    }
  };

  const handleUnitIssueNavigation = (code?: string) => {
    if (!id) return;
    if (code?.startsWith('media_')) {
      router.push(`/project-sales/${id}/media` as never);
    } else {
      router.push(`/project-sales/${id}/stock` as never);
    }
  };

  const handleCompletionIssueNavigation = (code?: string) => {
    if (!id) return;
    switch (code) {
      case 'MAP_LOCATION_REQUIRED':
      case 'ADDRESS_REQUIRED':
      case 'NEIGHBORHOOD_REQUIRED':
        router.push(`/project-sales/${id}/location` as never);
        break;
      case 'BLOCK_REQUIRED':
      case 'BLOCK_FLOOR_REQUIRED':
        router.push(`/project-sales/${id}/structure` as never);
        break;
      case 'UNIT_REQUIRED':
      case 'UNIT_COUNT_MISMATCH':
      case 'SALES_COUNT_MISMATCH':
      case 'INCOMPLETE_UNIT_STRUCTURE':
        router.push(`/project-sales/${id}/inventory` as never);
        break;
      default:
        router.push(`/project-sales/${id}/setup` as never);
        break;
    }
  };

  const completionIssues = completion?.issues || [];

  const defaultChecks: CheckItem[] = [
    { key: 'project_completed', label: 'Proje kurulumu tamamlandı', passed: isSetupCompleted },
    { key: 'sales_stock_exists', label: 'Satış stoku oluşturuldu', passed: false },
    { key: 'prices_entered', label: 'Satış stokunda fiyatlar girildi', passed: false },
    { key: 'media_uploaded', label: 'Görsel paketleri yüklendi', passed: false },
    { key: 'active_stock_available', label: 'Yayınlanabilir aktif stok var', passed: false },
  ];

  const checks: CheckItem[] =
    launch?.publishReadiness?.checks && launch.publishReadiness.checks.length > 0
      ? launch.publishReadiness.checks
      : defaultChecks;

  const passedChecks = checks.filter((c) => c.passed);
  const missingChecks = checks.filter((c) => !c.passed);

  const unitIssues = (launch?.publishReadiness?.issues || []).filter(
    (issue) =>
      issue.code &&
      issue.code !== 'media_uploaded' &&
      (issue.code.startsWith('price_') || issue.code.startsWith('media_'))
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <NativeHeader title="Son Kontrol ve Yayın" subtitle={launch?.project?.name} />
      <ProjectStepNav currentKey="launch" projectId={id} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* 1. Proje Kurulum Kontrolü Kartı */}
        <View style={[styles.card, completion?.ready ? styles.ok : styles.warn]}>
          <Ionicons
            name={completion?.ready ? 'checkmark-circle' : 'alert-circle'}
            size={28}
            color={completion?.ready ? EPH.success : EPH.warning}
          />
          <Text style={styles.cardTitle}>Proje Kurulum Kontrolü</Text>
          <Text style={styles.cardText}>
            {completion?.ready
              ? 'Proje kurulumunu tamamlamak için zorunlu alanlar hazır.'
              : 'Tamamlanması gereken kurulum alanları var. Eksik maddeye dokunarak ilgili adıma gidebilirsiniz.'}
          </Text>

          {completionIssues.length > 0 ? (
            <View style={styles.listContainer}>
              {completionIssues.map((issue) => (
                <Pressable
                  key={`${issue.code}-${issue.message}`}
                  style={({ pressed }) => [
                    styles.rowItem,
                    styles.rowMissing,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => handleCompletionIssueNavigation(issue.code)}
                  accessibilityRole="button"
                  accessibilityLabel={`Eksik: ${issue.message}`}
                >
                  <Ionicons name="alert-circle" size={18} color="#DC2626" />
                  <Text style={styles.rowMissingText}>{issue.message}</Text>
                  <View style={styles.actionChip}>
                    <Text style={styles.actionChipText}>Git</Text>
                    <Ionicons name="chevron-forward" size={13} color="#DC2626" />
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}

          {completion?.ready && launch?.project?.setupStatus !== 'TAMAMLANDI' ? (
            <PrimaryButton
              label={busy === 'complete' ? 'Tamamlanıyor...' : 'Proje Kurulumunu Tamamla'}
              disabled={!!busy}
              onPress={() => void complete()}
              style={{ width: '100%', marginTop: 4 }}
            />
          ) : null}
        </View>

        {/* 2. Yayın Öncesi Eksikler / Havuz Yayın Hazırlığı Kartı */}
        <View style={[styles.card, isPublishReady ? styles.ok : styles.warn]}>
          <Ionicons
            name={isPublishReady ? 'checkmark-circle' : 'alert-circle'}
            size={28}
            color={isPublishReady ? EPH.success : EPH.warning}
          />
          <Text style={styles.cardTitle}>
            {isPublishReady ? 'Yayına Hazır' : 'Yayın Öncesi Kontroller'}
          </Text>
          <Text style={styles.cardText}>
            {isPublishReady
              ? 'Proje Havuz yayınına hazır. Tüm kontroller başarıyla tamamlandı.'
              : 'Havuza göndermeden önce eksiklerin tamamlanması gerekmektedir. Eksik maddeye dokunarak ilgili adıma gidebilirsiniz.'}
          </Text>

          {/* Eksik Maddeler */}
          {missingChecks.length > 0 ? (
            <View style={styles.listContainer}>
              <Text style={styles.sectionHeading}>Eksik Maddeler ({missingChecks.length})</Text>
              {missingChecks.map((check) => (
                <Pressable
                  key={check.key}
                  style={({ pressed }) => [
                    styles.rowItem,
                    styles.rowMissing,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => navigateToCheck(check.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`Eksik: ${check.label}`}
                >
                  <Ionicons name="close-circle" size={20} color="#DC2626" />
                  <View style={styles.rowContent}>
                    <Text style={styles.rowMissingText}>{check.label}</Text>
                    {check.detail ? (
                      <Text style={styles.rowDetailMissing}>{check.detail}</Text>
                    ) : null}
                  </View>
                  <View style={styles.actionChip}>
                    <Text style={styles.actionChipText}>Git</Text>
                    <Ionicons name="chevron-forward" size={13} color="#DC2626" />
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}

          {/* Bağımsız Bölüm Bazlı Eksikler (fiyat / görsel) */}
          {unitIssues.length > 0 ? (
            <View style={styles.listContainer}>
              <Text style={styles.sectionHeading}>Bölüm Bazlı Eksikler ({unitIssues.length})</Text>
              {unitIssues.map((issue, idx) => (
                <Pressable
                  key={issue.code || String(idx)}
                  style={({ pressed }) => [
                    styles.rowItem,
                    styles.rowMissing,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => handleUnitIssueNavigation(issue.code)}
                  accessibilityRole="button"
                  accessibilityLabel={`Bölüm eksiği: ${issue.message}`}
                >
                  <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
                  <View style={styles.rowContent}>
                    <Text style={styles.rowMissingText}>{issue.message}</Text>
                  </View>
                  <View style={styles.actionChip}>
                    <Text style={styles.actionChipText}>Git</Text>
                    <Ionicons name="chevron-forward" size={13} color="#DC2626" />
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}

          {/* Tamamlanan Maddeler */}
          {passedChecks.length > 0 ? (
            <View style={styles.listContainer}>
              {!isPublishReady ? (
                <Text style={styles.sectionHeadingSuccess}>
                  Tamamlanan Kontroller ({passedChecks.length})
                </Text>
              ) : null}
              {passedChecks.map((check) => (
                <View key={check.key} style={[styles.rowItem, styles.rowPassed]}>
                  <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                  <View style={styles.rowContent}>
                    <Text style={styles.rowPassedText}>{check.label}</Text>
                    {check.detail ? (
                      <Text style={styles.rowDetailPassed}>{check.detail}</Text>
                    ) : null}
                  </View>
                  <View style={styles.badgePassed}>
                    <Text style={styles.badgePassedText}>Tamam</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {/* 3. Satış Araçları Kartı */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Satış Araçları</Text>
          <Text style={styles.cardText}>
            Render briefi; sahne, çekim ve çıktı ihtiyaçlarını listeler. Bu düğme fotoğraf veya 3D görsel üretmez.
          </Text>

          <SecondaryButton
            label={busy === 'render' ? 'Hazırlanıyor...' : 'Render Görseli İçin Brief Hazırla'}
            icon="images-outline"
            disabled={!!busy}
            onPress={() => void render()}
          />

          <View style={styles.buttonWithHint}>
            <SecondaryButton
              label={busy === 'presentation' ? 'Hazırlanıyor...' : 'Müşteri Sunumu Oluştur / Paylaş'}
              icon="share-social-outline"
              disabled={!!busy || !isSetupCompleted}
              onPress={() => void presentation()}
            />
            {!isSetupCompleted ? (
              <Text style={styles.disabledHint}>Proje kurulumu tamamlanınca aktif olur.</Text>
            ) : null}
          </View>
        </View>

        {/* 4. Havuza Gönder & Havuzdan Çek Butonları */}
        <View style={styles.buttonWithHint}>
          <PrimaryButton
            label={busy === 'publish' ? 'Yayınlanıyor...' : 'Havuza Gönder'}
            icon="rocket-outline"
            disabled={!!busy || !isPublishReady}
            onPress={() => {
              if (!isPublishReady || busy) return;
              setAudienceOpen(true);
            }}
          />
          {!isPublishReady ? (
            <Text style={styles.disabledHint}>Proje kurulumu tamamlanınca aktif olur.</Text>
          ) : null}
        </View>

        <View style={styles.buttonWithHint}>
          <SecondaryButton
            label={busy === 'withdraw' ? 'Geri Çekiliyor...' : 'Havuzdan Geri Çek'}
            disabled={!!busy || !launch?.project?.inPool}
            onPress={() => void withdraw()}
          />
          {!launch?.project?.inPool ? (
            <Text style={styles.disabledHint}>Proje havuzda değil.</Text>
          ) : null}
        </View>

        <SecondaryButton
          label="Önceki Adım: 3D Yerleşim"
          icon="cube-outline"
          onPress={() => router.push(`/project-sales/${id}/scene` as never)}
        />
      </ScrollView>

      <PoolAudienceModal
        projectId={audienceOpen ? String(id) : null}
        title="Proje Görünürlüğü"
        onClose={() => setAudienceOpen(false)}
        onSave={publish}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: EPH.page,
  },
  content: {
    padding: 12,
    paddingBottom: 48,
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: EPH.border,
    borderRadius: 22,
    padding: 14,
    gap: 10,
    alignItems: 'center',
  },
  ok: {
    borderColor: '#86EFAC',
    backgroundColor: '#FAFFFC',
  },
  warn: {
    borderColor: '#FCD34D',
    backgroundColor: '#FFFEF5',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: EPH.text,
    textAlign: 'center',
  },
  cardText: {
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 18,
    color: EPH.muted,
    textAlign: 'center',
  },
  listContainer: {
    alignSelf: 'stretch',
    gap: 8,
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#DC2626',
    marginTop: 4,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  sectionHeadingSuccess: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#16A34A',
    marginTop: 6,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  rowItem: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  rowMissing: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  rowPassed: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowMissingText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    color: '#DC2626',
  },
  rowDetailMissing: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#991B1B',
  },
  rowPassedText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    color: '#166534',
  },
  rowDetailPassed: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#15803D',
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  actionChipText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#DC2626',
  },
  badgePassed: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgePassedText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#16A34A',
  },
  buttonWithHint: {
    alignSelf: 'stretch',
    gap: 4,
  },
  disabledHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 4,
  },
  pressed: {
    opacity: 0.75,
  },
});

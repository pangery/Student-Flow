import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Screen } from '../components/Screen';
import { TextbookReaderModal } from '../components/TextbookReaderModal';
import { sampleTextbooks } from '../services/sampleTextbooks';
import { textbookService } from '../services/textbookService';
import { isIOS } from '../theme/platform';
import { colors, radius, useAppTheme } from '../theme/theme';
import type { CachedTextbookMeta, Textbook } from '../types/models';

type FilterType = 'all' | 'enrolled' | 'cached' | 'available';

type Props = {
  studentSubjects?: any[];
  studentIdentity?: string;
};

export function TextbooksScreen({ studentSubjects = [], studentIdentity = 'default' }: Props) {
  const theme = useAppTheme();
  const isDark = theme.isDark;

  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [cachedMeta, setCachedMeta] = useState<Record<string, CachedTextbookMeta>>({});
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isAutoCaching, setIsAutoCaching] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Active Reader Modal state
  const [readerVisible, setReaderVisible] = useState(false);
  const [activeBook, setActiveBook] = useState<Textbook | null>(null);
  const [readerFromCache, setReaderFromCache] = useState(false);
  const [readerCachedAt, setReaderCachedAt] = useState<string | undefined>(undefined);

  const refreshData = async () => {
    const isOnline = await textbookService.getIsOnline();
    const meta = await textbookService.getCachedMeta(studentIdentity);
    const books = await textbookService.getAllTextbooks(studentSubjects);
    setIsOfflineMode(!isOnline);
    setCachedMeta(meta);
    setTextbooks(books);
  };

  useEffect(() => {
    refreshData();
  }, [studentSubjects, studentIdentity]);

  const handleToggleOfflineMode = async (offline: boolean) => {
    setIsOfflineMode(offline);
    await textbookService.setIsOnline(!offline);
  };

  const handleAutoCacheEnrolled = async () => {
    if (isOfflineMode) {
      Alert.alert(
        'Offline režim je zapnutý',
        'Pro automatické stažení nejdříve vypni offline režim.'
      );
      return;
    }
    setIsAutoCaching(true);
    try {
      const res = await textbookService.runAutoCacheForEnrolledSubjects(studentSubjects, studentIdentity);
      await refreshData();
      Alert.alert(
        'Offline příprava dokončena',
        `Nové staženo: ${res.newlyCached} | Již uloženo: ${res.alreadyCached} | Integrita ověřena.`
      );
    } catch {
      Alert.alert('Chyba', 'Uložení učebnic se nezdařilo.');
    } finally {
      setIsAutoCaching(false);
    }
  };

  const handleDownload = async (book: Textbook) => {
    if (isOfflineMode) {
      Alert.alert(
        'Offline režim je zapnutý',
        'Pro stažení nové učebnice nejdříve vypni offline režim nahoře.'
      );
      return;
    }
    setDownloadingId(book.id);
    setTimeout(async () => {
      const ok = await textbookService.downloadForOffline(book.id, studentIdentity);
      setDownloadingId(null);
      if (ok) {
        await refreshData();
      }
    }, 400);
  };

  const handleRemove = async (book: Textbook) => {
    Alert.alert(
      'Smazat staženou učebnici',
      `Chceš uvolnit místo v telefonu a smazat offline kopii knihy „${book.title}“?`,
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Smazat',
          style: 'destructive',
          onPress: async () => {
            await textbookService.removeFromCache(book.id, studentIdentity);
            await refreshData();
          },
        },
      ]
    );
  };

  const handleOpenReader = async (book: Textbook) => {
    const result = await textbookService.loadTextbookForReading(book.id, studentIdentity);
    if (!result) {
      Alert.alert(
        'Kniha není stažena',
        'Tuto učebnici zatím nemáš uloženou pro offline čtení. Vypni nahoře offline režim a stáhni si ji.'
      );
      return;
    }

    setActiveBook(result.textbook);
    setReaderFromCache(result.fromCache);
    setReaderCachedAt(result.cachedAt);
    setReaderVisible(true);
  };

  const cachedCount = textbooks.filter(book => cachedMeta[book.id]).length;
  const totalCachedKb = Object.values(cachedMeta).reduce((sum, item) => sum + item.sizeKb, 0);
  const totalCachedMb = (totalCachedKb / 1024).toFixed(1);

  const enrolledCount = textbooks.filter((b: any) => b.isEnrolled).length;

  const filteredBooks = textbooks
    .filter((b: any) => {
      const isCached = Boolean(cachedMeta[b.id]);
      if (activeFilter === 'enrolled') return Boolean(b.isEnrolled);
      if (activeFilter === 'cached') return isCached;
      if (activeFilter === 'available') return !isCached;
      return true;
    })
    .filter((b) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        b.title.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.subjectName.toLowerCase().includes(q)
      );
    });

  if (!textbooks.length) {
    return (
      <Screen>
        <View style={styles.header}>
          <Text style={[styles.headerEyebrow, { color: theme.secondary }]}>STUDIJNÍ MATERIÁLY</Text>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Učebnice</Text>
        </View>
        <View style={[styles.emptyStateCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="library-outline" size={36} color={theme.secondary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Učebnice zatím nejsou dostupné</Text>
          <Text style={[styles.emptySub, { color: theme.secondary }]}>Školní knihovna zatím není připojená. Studijní materiály najdeš u svých předmětů na Unicornu.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* Everyday Header */}
      <View style={styles.header}>
        <Text style={[styles.headerEyebrow, { color: isDark ? '#38BDF8' : '#2563EB' }]}>
          STUDIJNÍ MATERIÁLY
        </Text>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Učebnice</Text>
      </View>

      {/* Everyday Offline Switch Row */}
      <View
        style={[
          styles.switchRow,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            shadowColor: theme.cardShadow,
            shadowOpacity: theme.cardShadowOpacity,
          },
        ]}
      >
        <View style={styles.switchInfo}>
          <View style={styles.switchTitleRow}>
            <Ionicons
              name={isOfflineMode ? 'airplane-outline' : 'cloud-done-outline'}
              size={17}
              color={isOfflineMode ? '#F59E0B' : '#10B981'}
            />
            <Text style={[styles.switchTitle, { color: theme.text }]}>
              {isOfflineMode ? 'Offline mód (bez internetu)' : 'Online synchronizace'}
            </Text>
          </View>
          <Text style={[styles.switchDesc, { color: theme.secondary }]}>
            {isOfflineMode
              ? 'Pracuješ pouze se staženými knihami v paměti zařízení.'
              : 'Připojeno k portálu. Můžeš číst i stahovat nové knihy.'}
          </Text>
        </View>

        <Switch
          value={isOfflineMode}
          onValueChange={handleToggleOfflineMode}
          trackColor={{ false: isDark ? '#1E293B' : '#E2E8F0', true: '#D97706' }}
          thumbColor={isOfflineMode ? '#F59E0B' : '#FFFFFF'}
        />
      </View>

      {/* Storage info strip */}
      <View style={styles.storageBar}>
        <View style={styles.storageLeft}>
          <Ionicons
            name="phone-portrait-outline"
            size={14}
            color={isDark ? '#38BDF8' : '#2563EB'}
          />
          <Text style={[styles.storageText, { color: theme.secondary }]}>
            Paměť:{' '}
            <Text style={{ fontWeight: '700', color: theme.text }}>
              {cachedCount} ze {textbooks.length} knih
            </Text>{' '}
            ({totalCachedMb} MB)
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {enrolledCount > 0 && (
            <Pressable
              onPress={handleAutoCacheEnrolled}
              disabled={isAutoCaching}
              hitSlop={8}
              style={[
                styles.clearBtn,
                {
                  borderColor: isDark ? '#38BDF8' : '#2563EB',
                  backgroundColor: isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(37, 99, 235, 0.08)',
                },
              ]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={13}
                color={isDark ? '#38BDF8' : '#2563EB'}
              />
              <Text
                style={[
                  styles.clearText,
                  { color: isDark ? '#38BDF8' : '#2563EB' },
                ]}
              >
                {isAutoCaching ? 'Zabezpečuji...' : 'Stáhnout semestr'}
              </Text>
            </Pressable>
          )}

          {cachedCount > 0 && (
            <Pressable
              onPress={async () => {
                Alert.alert(
                  'Vymazat mezipaměť',
                  'Chceš smazat všechny stažené učebnice z telefonu a uvolnit místo?',
                  [
                    { text: 'Zrušit', style: 'cancel' },
                    {
                      text: 'Vymazat',
                      style: 'destructive',
                      onPress: async () => {
                        await textbookService.clearAllCache(studentIdentity);
                        await refreshData();
                      },
                    },
                  ]
                );
              }}
              hitSlop={8}
              style={styles.clearBtn}
            >
              <Ionicons name="trash-outline" size={13} color="#EF4444" />
              <Text style={styles.clearText}>Vymazat</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Search Input Bar */}
      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
      >
        <Ionicons name="search-outline" size={17} color={theme.secondary} />
        <TextInput
          placeholder="Hledat učebnici, kód nebo autora..."
          placeholderTextColor={theme.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchInput, { color: theme.text }]}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={17} color={theme.secondary} />
          </Pressable>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <Pressable
          onPress={() => setActiveFilter('all')}
          style={[
            styles.filterChip,
            {
              backgroundColor:
                activeFilter === 'all'
                  ? isDark
                    ? '#2563EB'
                    : '#0F172A'
                  : isDark
                  ? 'rgba(255,255,255,0.06)'
                  : '#F1F5F9',
              borderColor: theme.border,
            },
          ]}
        >
          <Text
            style={[
              styles.filterText,
              { color: activeFilter === 'all' ? '#FFFFFF' : theme.secondary },
            ]}
          >
            Všechny ({textbooks.length})
          </Text>
        </Pressable>

        {enrolledCount > 0 && (
          <Pressable
            onPress={() => setActiveFilter('enrolled')}
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  activeFilter === 'enrolled'
                    ? isDark
                      ? '#2563EB'
                      : '#0F172A'
                    : isDark
                    ? 'rgba(255,255,255,0.06)'
                    : '#F1F5F9',
                borderColor: theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: activeFilter === 'enrolled' ? '#FFFFFF' : theme.secondary },
              ]}
            >
              Moje předměty ({enrolledCount})
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => setActiveFilter('cached')}
          style={[
            styles.filterChip,
            {
              backgroundColor:
                activeFilter === 'cached'
                  ? isDark
                    ? '#2563EB'
                    : '#0F172A'
                  : isDark
                  ? 'rgba(255,255,255,0.06)'
                  : '#F1F5F9',
              borderColor: theme.border,
            },
          ]}
        >
          <Text
            style={[
              styles.filterText,
              { color: activeFilter === 'cached' ? '#FFFFFF' : theme.secondary },
            ]}
          >
            V paměti ({cachedCount})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveFilter('available')}
          style={[
            styles.filterChip,
            {
              backgroundColor:
                activeFilter === 'available'
                  ? isDark
                    ? '#2563EB'
                    : '#0F172A'
                  : isDark
                  ? 'rgba(255,255,255,0.06)'
                  : '#F1F5F9',
              borderColor: theme.border,
            },
          ]}
        >
          <Text
            style={[
              styles.filterText,
              { color: activeFilter === 'available' ? '#FFFFFF' : theme.secondary },
            ]}
          >
            Ke stažení ({textbooks.length - cachedCount})
          </Text>
        </Pressable>
      </View>

      {/* Books List */}
      <View style={styles.booksList}>
        {filteredBooks.length === 0 ? (
          <View
            style={[
              styles.emptyStateCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Ionicons name="book-outline" size={32} color={theme.muted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {searchQuery ? 'Žádná kniha neodpovídá hledání' : 'Žádné učebnice ve filtru'}
            </Text>
            <Text style={[styles.emptySub, { color: theme.secondary }]}>
              Zkus změnit filtr nebo vyhledávací dotaz.
            </Text>
          </View>
        ) : (
          filteredBooks.map((book) => {
            const isCached = Boolean(cachedMeta[book.id]);
            const isDownloading = downloadingId === book.id;
            const totalReadTime = book.chapters.reduce(
              (acc, c) => acc + c.readTimeMinutes,
              0
            );

            return (
              <View
                key={book.id}
                style={[
                  styles.bookCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    shadowColor: theme.cardShadow,
                    shadowOpacity: theme.cardShadowOpacity,
                  },
                ]}
              >
                <View style={styles.cardTop}>
                  <View
                    style={[
                      styles.codeBadge,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255,255,255,0.06)'
                          : '#F1F5F9',
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.codeText,
                        { color: isDark ? '#38BDF8' : '#2563EB' },
                      ]}
                    >
                      {book.code}
                    </Text>
                  </View>

                  {isCached ? (
                    <View
                      style={[
                        styles.cachedPill,
                        {
                          backgroundColor: isDark
                            ? 'rgba(16,185,129,0.14)'
                            : '#ECFDF5',
                          borderColor: isDark
                            ? 'rgba(16,185,129,0.3)'
                            : '#A7F3D0',
                        },
                      ]}
                    >
                      <View style={styles.greenDot} />
                      <Text
                        style={[
                          styles.cachedPillText,
                          { color: isDark ? '#34D399' : '#059669' },
                        ]}
                      >
                        Offline v paměti
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.notCachedText, { color: theme.muted }]}>
                      {(book.sizeKb / 1024).toFixed(1)} MB
                    </Text>
                  )}
                </View>

                <Text style={[styles.bookTitle, { color: theme.text }]}>
                  {book.title}
                </Text>
                <Text style={[styles.bookAuthor, { color: theme.secondary }]}>
                  {book.author}
                </Text>

                {/* Chapters & Read Time Tag */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Ionicons name="document-text-outline" size={12} color={theme.secondary} />
                    <Text style={[styles.statText, { color: theme.secondary }]}>
                      {book.chapters.length} {book.chapters.length === 1 ? 'kapitola' : book.chapters.length < 5 ? 'kapitoly' : 'kapitol'}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="time-outline" size={12} color={theme.secondary} />
                    <Text style={[styles.statText, { color: theme.secondary }]}>
                      ~{totalReadTime} min čtení
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.cardActions,
                    { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' },
                  ]}
                >
                  <Pressable
                    onPress={() => handleOpenReader(book)}
                    style={({ pressed }) => [
                      styles.readBtn,
                      { backgroundColor: isDark ? '#2563EB' : '#0F172A' },
                      pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                    ]}
                  >
                    <Ionicons name="book-outline" size={15} color="#FFFFFF" />
                    <Text style={styles.readBtnText}>Číst učebnici</Text>
                  </Pressable>

                  {isCached ? (
                    <Pressable
                      onPress={() => handleRemove(book)}
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.removeBtn,
                        {
                          backgroundColor: isDark
                            ? 'rgba(255,255,255,0.04)'
                            : '#F1F5F9',
                        },
                        pressed && { opacity: 0.6 },
                      ]}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color={isDark ? '#FB7185' : '#EF4444'}
                      />
                    </Pressable>
                  ) : (
                    <Pressable
                      disabled={isDownloading || isOfflineMode}
                      onPress={() => handleDownload(book)}
                      style={({ pressed }) => [
                        styles.downloadBtn,
                        {
                          backgroundColor: isDark
                            ? 'rgba(255,255,255,0.08)'
                            : '#F1F5F9',
                          borderColor: theme.border,
                        },
                        isOfflineMode && { opacity: 0.4 },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      {isDownloading ? (
                        <ActivityIndicator
                          size="small"
                          color={isDark ? '#38BDF8' : '#2563EB'}
                        />
                      ) : (
                        <>
                          <Ionicons
                            name="cloud-download-outline"
                            size={15}
                            color={theme.text}
                          />
                          <Text
                            style={[
                              styles.downloadBtnText,
                              { color: theme.text },
                            ]}
                          >
                            Stáhnout offline
                          </Text>
                        </>
                      )}
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Reader Modal Component */}
      <TextbookReaderModal
        visible={readerVisible}
        textbook={activeBook}
        fromCache={readerFromCache}
        cachedAt={readerCachedAt}
        onClose={() => setReaderVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 2,
    marginBottom: 4,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: isIOS ? 34 : 30,
    fontWeight: isIOS ? '800' : '700',
    color: '#FFFFFF',
    letterSpacing: isIOS ? -0.5 : 0,
  },
  switchRow: {
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.medium,
    padding: 16,
    borderWidth: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginTop: 2,
  },
  switchInfo: {
    minWidth: 0,
    flex: 1,
    paddingRight: 16,
    gap: 4,
  },
  switchTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  switchTitle: {
    flexShrink: 1,
    fontSize: 14.5,
    fontWeight: '700',
  },
  switchDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  storageBar: {
    gap: 12,
    flexWrap: 'wrap',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 8,
  },
  storageLeft: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storageText: {
    flexShrink: 1,
    fontSize: 12,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#EF4444',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: isIOS ? 10 : 8,
    borderRadius: radius.medium,
    borderWidth: 1,
    marginTop: 6,
  },
  searchInput: {
    minHeight: 28,
    minWidth: 0,
    flex: 1,
    fontSize: 13.5,
    padding: 0,
  },
  filterRow: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  filterChip: {
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  booksList: {
    gap: 12,
    marginTop: 4,
    marginBottom: 20,
  },
  bookCard: {
    borderRadius: radius.medium,
    padding: 16,
    borderWidth: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  codeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  cachedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  cachedPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  notCachedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bookTitle: {
    fontSize: 16.5,
    fontWeight: isIOS ? '800' : '700',
    lineHeight: 22,
  },
  bookAuthor: {
    fontSize: 12.5,
    lineHeight: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 2,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    marginTop: 4,
  },
  readBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  readBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  removeBtn: {
    padding: 8,
    borderRadius: radius.pill,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  downloadBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  emptyStateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: radius.medium,
    borderWidth: 1,
    gap: 8,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 12.5,
  },
});

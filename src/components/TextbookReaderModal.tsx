import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isIOS } from '../theme/platform';
import { colors, radius, useAppTheme } from '../theme/theme';
import type { Textbook } from '../types/models';

type Props = {
  visible: boolean;
  textbook: Textbook | null;
  fromCache: boolean;
  cachedAt?: string;
  onClose: () => void;
};

export function TextbookReaderModal({
  visible,
  textbook,
  fromCache,
  cachedAt,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const isDark = theme.isDark;

  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [fontSizeOffset, setFontSizeOffset] = useState<number>(0); // -2, 0, +2, +4
  const [completedChapters, setCompletedChapters] = useState<Record<string, boolean>>({});
  const [copiedSnippetIndex, setCopiedSnippetIndex] = useState<number | null>(null);

  if (!textbook || !textbook.chapters.length) return null;

  const chapters = textbook.chapters;
  const currentChapter = chapters[activeChapterIndex] ?? chapters[0];
  if (!currentChapter) return null;

  const isCurrentChapterCompleted = Boolean(completedChapters[currentChapter.id]);

  const toggleChapterCompleted = () => {
    setCompletedChapters((prev) => ({
      ...prev,
      [currentChapter.id]: !prev[currentChapter.id],
    }));
  };

  const handleCopyCode = (sIndex: number) => {
    setCopiedSnippetIndex(sIndex);
    setTimeout(() => {
      setCopiedSnippetIndex(null);
    }, 2000);
  };

  const baseBodyFontSize = 15 + fontSizeOffset;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 14),
            backgroundColor: theme.background,
          },
        ]}
      >
        {/* Modal Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: isDark ? '#0D1424' : '#FFFFFF',
              borderBottomColor: theme.border,
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <View style={styles.headerBadgeRow}>
              <Text
                style={[
                  styles.bookCode,
                  { color: isDark ? '#38BDF8' : '#2563EB' },
                ]}
              >
                {textbook.code}
              </Text>
              <View
                style={[
                  styles.dotSeparator,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.2)'
                      : 'rgba(15,23,42,0.2)',
                  },
                ]}
              />
              <Text style={styles.offlineStatus}>
                {fromCache ? 'Uloženo v telefonu' : 'Online verze'}
              </Text>
            </View>
            <Text
              style={[styles.bookTitle, { color: theme.text }]}
              numberOfLines={1}
            >
              {textbook.title}
            </Text>
          </View>

          {/* Controls: Font Size & Close */}
          <View style={styles.headerControls}>
            {/* Font size toggle */}
            <Pressable
              onPress={() =>
                setFontSizeOffset((prev) => (prev >= 4 ? -2 : prev + 2))
              }
              hitSlop={8}
              style={[
                styles.controlBtn,
                {
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.08)'
                    : '#F1F5F9',
                  borderColor: theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.fontControlText,
                  { color: isDark ? '#38BDF8' : '#2563EB' },
                ]}
              >
                {fontSizeOffset === -2 ? 'A-' : fontSizeOffset === 4 ? 'A++' : 'A+'}
              </Text>
            </Pressable>

            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [
                styles.closeBtn,
                {
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.08)'
                    : '#F1F5F9',
                  borderColor: theme.border,
                },
                pressed && { opacity: 0.6 },
              ]}
            >
              <Ionicons name="close" size={18} color={theme.text} />
            </Pressable>
          </View>
        </View>

        {/* Chapter Switcher Bar */}
        <View
          style={[
            styles.chapterTabsBar,
            {
              backgroundColor: isDark ? '#0D1424' : '#F8FAFC',
              borderBottomColor: theme.border,
            },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScroll}
          >
            {chapters.map((ch, idx) => {
              const isActive = idx === activeChapterIndex;
              const isChDone = Boolean(completedChapters[ch.id]);

              return (
                <Pressable
                  key={ch.id}
                  onPress={() => setActiveChapterIndex(idx)}
                  style={[
                    styles.tabItem,
                    {
                      backgroundColor: isActive
                        ? isDark
                          ? '#2563EB'
                          : '#0F172A'
                        : isDark
                        ? 'rgba(255,255,255,0.05)'
                        : '#F1F5F9',
                    },
                  ]}
                >
                  {isChDone && (
                    <Ionicons
                      name="checkmark-circle"
                      size={13}
                      color={isActive ? '#34D399' : '#10B981'}
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.tabText,
                      { color: isActive ? '#FFFFFF' : theme.secondary },
                    ]}
                  >
                    Kapitola {ch.order}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Reader Body */}
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: insets.bottom + 90 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Chapter Meta & Read status toggle */}
          <View style={styles.chapterMetaRow}>
            <View style={styles.chapterMeta}>
              <Text
                style={[
                  styles.readTime,
                  { color: isDark ? '#38BDF8' : '#2563EB' },
                ]}
              >
                {currentChapter.readTimeMinutes} min čtení · Kapitola {currentChapter.order}
              </Text>
              <Text style={[styles.chapterHeading, { color: theme.text }]}>
                {currentChapter.title}
              </Text>
            </View>

            <Pressable
              onPress={toggleChapterCompleted}
              style={({ pressed }) => [
                styles.markDoneBtn,
                isCurrentChapterCompleted
                  ? {
                      backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#ECFDF5',
                      borderColor: isDark ? 'rgba(16,185,129,0.35)' : '#A7F3D0',
                    }
                  : {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                      borderColor: theme.border,
                    },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Ionicons
                name={isCurrentChapterCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={
                  isCurrentChapterCompleted
                    ? '#10B981'
                    : isDark
                    ? '#64748B'
                    : '#94A3B8'
                }
              />
              <Text
                style={[
                  styles.markDoneText,
                  {
                    color: isCurrentChapterCompleted
                      ? isDark
                        ? '#34D399'
                        : '#059669'
                      : theme.secondary,
                  },
                ]}
              >
                {isCurrentChapterCompleted ? 'Přečteno' : 'Označit'}
              </Text>
            </Pressable>
          </View>

          {/* Clean Summary Card */}
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderLeftColor: isDark ? '#38BDF8' : '#2563EB',
              },
            ]}
          >
            <View style={styles.summaryHeader}>
              <Ionicons
                name="bulb-outline"
                size={16}
                color={isDark ? '#38BDF8' : '#2563EB'}
              />
              <Text
                style={[
                  styles.summaryLabel,
                  { color: isDark ? '#38BDF8' : '#2563EB' },
                ]}
              >
                HLAVNÍ MYŠLENKA
              </Text>
            </View>
            <Text
              style={[
                styles.summaryText,
                { color: theme.text, fontSize: baseBodyFontSize },
              ]}
            >
              {currentChapter.summary}
            </Text>
          </View>

          {/* Sections */}
          {currentChapter.sections.map((section, sIndex) => (
            <View key={sIndex} style={styles.sectionBlock}>
              <Text style={[styles.sectionHeading, { color: theme.text }]}>
                {section.heading}
              </Text>
              <Text
                style={[
                  styles.sectionBody,
                  {
                    color: isDark ? '#CBD5E1' : '#334155',
                    fontSize: baseBodyFontSize,
                    lineHeight: baseBodyFontSize * 1.55,
                  },
                ]}
              >
                {section.body}
              </Text>

              {section.codeSnippet && (
                <View style={styles.codeContainer}>
                  <View style={styles.codeHeader}>
                    <Text style={styles.codeHeaderLang}>TYPESCRIPT</Text>
                    <Pressable
                      onPress={() => handleCopyCode(sIndex)}
                      hitSlop={8}
                      style={styles.copyBtn}
                    >
                      <Ionicons
                        name={copiedSnippetIndex === sIndex ? 'checkmark' : 'copy-outline'}
                        size={13}
                        color={copiedSnippetIndex === sIndex ? '#34D399' : '#94A3B8'}
                      />
                      <Text
                        style={[
                          styles.copyBtnText,
                          {
                            color:
                              copiedSnippetIndex === sIndex
                                ? '#34D399'
                                : '#94A3B8',
                          },
                        ]}
                      >
                        {copiedSnippetIndex === sIndex ? 'Zkopírováno' : 'Kopírovat'}
                      </Text>
                    </Pressable>
                  </View>

                  <View style={styles.codeBlock}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <Text style={styles.codeText}>{section.codeSnippet}</Text>
                    </ScrollView>
                  </View>
                </View>
              )}

              {section.tip && (
                <View
                  style={[
                    styles.tipBlock,
                    {
                      backgroundColor: isDark
                        ? 'rgba(56,189,248,0.08)'
                        : '#F0F9FF',
                      borderColor: isDark
                        ? 'rgba(56,189,248,0.25)'
                        : '#BAE6FD',
                    },
                  ]}
                >
                  <Ionicons
                    name="information-circle"
                    size={17}
                    color={isDark ? '#38BDF8' : '#0284C7'}
                  />
                  <Text
                    style={[
                      styles.tipText,
                      {
                        color: isDark ? '#BAE6FD' : '#0369A1',
                        fontSize: baseBodyFontSize - 1,
                      },
                    ]}
                  >
                    {section.tip}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Sticky Navigation Footer */}
        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              backgroundColor: isDark ? '#0D1424' : '#FFFFFF',
              borderTopColor: theme.border,
            },
          ]}
        >
          <Pressable
            disabled={activeChapterIndex === 0}
            onPress={() => setActiveChapterIndex((p) => Math.max(0, p - 1))}
            style={({ pressed }) => [
              styles.navBtn,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                borderColor: theme.border,
              },
              activeChapterIndex === 0 && { opacity: 0.3 },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="chevron-back" size={16} color={theme.text} />
            <Text style={[styles.navBtnText, { color: theme.text }]}>Předchozí</Text>
          </Pressable>

          <Text style={[styles.pageText, { color: theme.secondary }]}>
            {activeChapterIndex + 1} z {chapters.length}
          </Text>

          <Pressable
            disabled={activeChapterIndex === chapters.length - 1}
            onPress={() =>
              setActiveChapterIndex((p) => Math.min(chapters.length - 1, p + 1))
            }
            style={({ pressed }) => [
              styles.navBtn,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                borderColor: theme.border,
              },
              activeChapterIndex === chapters.length - 1 && { opacity: 0.3 },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.navBtnText, { color: theme.text }]}>Další</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.text} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  fontControlText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  bookCode: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  offlineStatus: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '700',
  },
  bookTitle: {
    fontSize: 15,
    fontWeight: isIOS ? '800' : '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  chapterTabsBar: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  tabText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 18,
    gap: 18,
  },
  chapterMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  chapterMeta: {
    flex: 1,
    gap: 3,
  },
  readTime: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  chapterHeading: {
    fontSize: 22,
    fontWeight: isIOS ? '800' : '700',
    lineHeight: 28,
  },
  markDoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  markDoneText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  summaryCard: {
    padding: 14,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderLeftWidth: 4,
    gap: 6,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  summaryText: {
    lineHeight: 22,
    fontWeight: '500',
  },
  sectionBlock: {
    gap: 8,
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: isIOS ? '800' : '700',
  },
  sectionBody: {
    lineHeight: 23,
  },
  codeContainer: {
    backgroundColor: '#0F172A',
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    marginTop: 6,
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  codeHeaderLang: {
    color: '#94A3B8',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  codeBlock: {
    padding: 14,
  },
  codeText: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 12.5,
    color: '#38BDF8',
    lineHeight: 18,
  },
  tipBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: radius.medium,
    borderWidth: 1,
    marginTop: 4,
  },
  tipText: {
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  navBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pageText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
});

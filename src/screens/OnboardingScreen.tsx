import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isIOS } from '../theme/platform';
import { colors, radius, spacing } from '../theme/theme';


type Props = {
  onComplete: () => void;
  onLogin: () => void;
};

const slides: Array<{
  id: string;
  badge: string;
  title: string; 
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: readonly [string, string, ...string[]];
  accent: string;
}> = [
  {
    id: '1',
    badge: 'UNICORN UNIVERSITY',
    title: 'Vítej ve StudentFlow',
    subtitle: 'Tvůj moderní kapesní asistent pro studium na Unicorn University.',
    icon: 'school',
    gradient: isIOS ? [colors.ink, '#0A2540', '#1A365D'] : [colors.ink, colors.blue, colors.violet],
    accent: colors.blue,
  },
  {
    id: '2',
    badge: 'ROZVRH & ÚKOLY',
    title: 'Měj přehled o každém dni',
    subtitle: 'Aktuální denní rozvrh, deadliny úkolů i odpočet k důležitým zkouškám.',
    icon: 'calendar',
    gradient: isIOS ? ['#0A2540', '#184A7E', '#1461EB'] : [colors.navy, colors.blue, colors.cyan],
    accent: colors.cyan,
  },
  {
    id: '3',
    badge: 'PLUS4U INTEGRACE',
    title: 'Připoj svůj školní účet',
    subtitle: 'Zabezpečené přihlášení přes Plus4U OIDC s hardwarově šifrovaným tokenem.',
    icon: 'shield-checkmark',
    gradient: isIOS ? ['#112B5C', '#3A1C71', '#7A38D1'] : [colors.ink, colors.violet, colors.magenta],
    accent: colors.violet,
  },
];

export function OnboardingScreen({ onComplete, onLogin }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const isLast = currentSlide === slides.length - 1;
  const slide = slides[currentSlide] ?? slides[0]!;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {isIOS && (
        <>
          <View style={styles.glowTop} />
          <View style={styles.glowBottom} />
        </>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, gap: 20, width: "100%", maxWidth: 600, alignSelf: "center" }}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoBadge}>
            <Ionicons name="sparkles" size={14} color={colors.white} />
          </View>
          <Text style={styles.logoText}>StudentFlow</Text>
        </View>
        {!isLast && (
          <Pressable
            onPress={onComplete}
            style={({ pressed }) => [styles.skipButton, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.skipText}>Přeskočit</Text>
          </Pressable>
        )}
      </View>

      {/* Main Slide Card */}
      <View style={styles.cardContainer}>
        <LinearGradient
          colors={slide.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.iconCircle}>
            <Ionicons name={slide.icon} size={42} color={colors.white} />
          </View>
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>{slide.badge}</Text>
          </View>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.subtitle}>{slide.subtitle}</Text>
        </LinearGradient>
      </View>

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {slides.map((_, idx) => (
          <Pressable
            key={idx}
            onPress={() => setCurrentSlide(idx)}
            style={[
              styles.dot,
              currentSlide === idx ? styles.activeDot : styles.inactiveDot,
              currentSlide === idx && { backgroundColor: slide.accent },
            ]}
          />
        ))}
      </View>

      {/* Bottom Action Buttons */}
      <View style={styles.bottomActions}>
        {isLast ? (
          <>
            <Pressable
              style={({ pressed }) => [
                styles.loginPrimaryButton,
                pressed && isIOS && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
              onPress={onLogin}
            >
              <Ionicons name={isIOS ? 'key-outline' : 'lock-open-outline'} size={18} color={colors.white} />
              <Text style={styles.loginPrimaryText}>Přihlásit přes Plus4U</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && { opacity: 0.7 },
              ]}
              onPress={onComplete}
            >
              <Text style={styles.secondaryText}>Pokračovat bez přihlášení</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.nextButton,
              pressed && isIOS && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
            android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>Pokračovat</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.white} />
          </Pressable>
        )}
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  glowTop: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(0,122,255,0.08)',
    top: -100,
    right: -80,
  },
  glowBottom: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(122,56,209,0.07)',
    bottom: -60,
    left: -80,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.2,
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  skipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  card: {
    borderRadius: radius.large,
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: isIOS ? '#000' : colors.blue,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
    minHeight: 340,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: isIOS ? 24 : radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  badgePill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 1.3,
  },
  title: {
    fontSize: isIOS ? 26 : 24,
    fontWeight: isIOS ? '800' : '700',
    color: colors.white,
    textAlign: 'center',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.sm,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.lg,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 24,
  },
  inactiveDot: {
    width: 8,
    backgroundColor: 'rgba(60,60,67,0.18)',
  },
  bottomActions: {
    gap: 12,
    paddingBottom: spacing.sm,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.blue,
    paddingVertical: 16,
    borderRadius: isIOS ? 18 : radius.pill,
    shadowColor: colors.blue,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  nextButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  loginPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.blue,
    paddingVertical: 16,
    borderRadius: isIOS ? 18 : radius.pill,
    shadowColor: colors.blue,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  loginPrimaryText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryText: {
    color: colors.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
});

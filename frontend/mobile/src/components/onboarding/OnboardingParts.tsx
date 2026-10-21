// Building blocks for sign-up and joining (welcome, email + code, name your home, join).

import { ShoppingBasket } from 'lucide-react-native';
import { useContext, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from '@/components/AppText';
import { OTP_LENGTH } from '@/data/fakeHousehold';
import { t } from '@/i18n';
import { isRTLLayout, LayoutDirectionContext } from '@/lib/direction';
import { colors, fonts, fontSize, layout, radius, size, spacing } from '@/theme';

// Emails and codes always read left-to-right, even inside an Arabic screen
const START_ALIGN = isRTLLayout ? 'right' : 'left';

// --- Email helpers -----------------------------------------------------------------

// Spaces and capitals don't matter in an email address
export const cleanEmail = (text: string) => text.trim().toLowerCase();
export const isValidEmail = (text: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail(text));

// Wrapped in left-to-right isolate marks so it doesn't get flipped inside an Arabic sentence
export const ltrEmail = (email: string) => `\u2066${cleanEmail(email)}\u2069`;

const onlyDigits = (text: string) => text.replace(/\D/g, '');

// --- App name with the basket logo -------------------------------------------------------

export function Brand() {
  return (
    <View style={styles.brand}>
      <View style={styles.logo}>
        <ShoppingBasket size={size.icon - spacing.xs} color={colors.ink} strokeWidth={size.iconStroke} />
      </View>
      <AppText variant="heading" weight="bold">
        {t('onboarding.appName')}
      </AppText>
    </View>
  );
}

// --- Progress dashes (current step dark, or all dark when done) ---------------------------

export function StepDashes({ current, total, done }: { current: number; total: number; done?: boolean }) {
  return (
    <View style={styles.dashes} accessible accessibilityLabel={t('onboarding.stepA11y', { n: current, total })}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.dash, (done || i === current - 1) && styles.dashActive]} />
      ))}
    </View>
  );
}

// --- Labelled text field ------------------------------------------------------------------

type FieldProps = Omit<TextInputProps, 'style'> & { label: string };

export function Field({ label, ...input }: FieldProps) {
  // Typing starts on the reading side (right in Arabic, left in a helper's English / Hindi)
  const direction = useContext(LayoutDirectionContext);
  return (
    <View style={styles.fieldBlock}>
      <AppText variant="label" weight="bold">
        {label}
      </AppText>
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, { textAlign: direction === 'rtl' ? 'right' : 'left' }]}
        accessibilityLabel={label}
        {...input}
      />
    </View>
  );
}

// --- Email field -------------------------------------------------------------------------

type EmailFieldProps = {
  value: string;
  onChange?: (email: string) => void; // leave out for a read-only email
  onEdit?: () => void; // shows «تعديل» on the start side
  onSubmit?: () => void; // the keyboard's «send» key
  autoFocus?: boolean;
  label: string;
};

export function EmailField({ value, onChange, onEdit, onSubmit, autoFocus, label }: EmailFieldProps) {
  return (
    <View style={styles.emailField}>
      {onEdit && (
        <Pressable onPress={onEdit} hitSlop={spacing.sm} style={styles.emailEdit} accessibilityRole="button">
          <AppText variant="label" weight="bold">
            {t('verify.edit')}
          </AppText>
        </Pressable>
      )}
      {onChange ? (
        <TextInput
          value={value}
          onChangeText={(text) => onChange(text.replace(/\s/g, ''))}
          onSubmitEditing={onSubmit}
          placeholder={t('verify.emailPlaceholder')}
          placeholderTextColor={colors.muted}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="send"
          autoFocus={autoFocus}
          style={[styles.emailInput, styles.emailText]}
          accessibilityLabel={label}
        />
      ) : (
        <View style={styles.emailReadOnly}>
          <AppText variant="item" numberOfLines={1} style={styles.ltrText} accessibilityLabel={label}>
            {cleanEmail(value)}
          </AppText>
        </View>
      )}
    </View>
  );
}

// --- 4-digit code boxes -------------------------------------------------------------------------

type CodeBoxesProps = {
  value: string;
  onChange: (code: string) => void;
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
};

// One hidden text field under the boxes, so the phone can offer the code from the email
export function CodeBoxes({ value, onChange, error, disabled, autoFocus }: CodeBoxesProps) {
  return (
    <View style={styles.codeRow}>
      {Array.from({ length: OTP_LENGTH }, (_, i) => {
        const active = !disabled && !error && i === value.length;
        return (
          <View
            key={i}
            style={[styles.codeBox, active && styles.codeBoxActive, error && styles.codeBoxError, disabled && styles.codeBoxDisabled]}>
            <AppText variant="heading" weight="bold">
              {value[i] ?? ''}
            </AppText>
          </View>
        );
      })}
      <TextInput
        value={value}
        onChangeText={(text) => {
          const digits = onlyDigits(text);
          // After a wrong code, the next digit typed starts a fresh code (no need to delete the old one)
          if (error && digits.length > value.length) return onChange(digits.slice(value.length, value.length + OTP_LENGTH));
          onChange(digits.slice(0, OTP_LENGTH));
        }}
        // After a wrong code, tapping the boxes clears them to type again
        onPressIn={() => error && onChange('')}
        editable={!disabled}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus={autoFocus}
        // One extra digit allowed after a wrong code, so typing can replace the full old one
        maxLength={error ? OTP_LENGTH + 1 : OTP_LENGTH}
        caretHidden
        style={styles.codeInput}
        accessibilityLabel={t('verify.codeA11y')}
      />
    </View>
  );
}

// --- Pill choice (language, dialect, gender) ----------------------------------------------------

export function ChoiceChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected ? styles.chipSelected : styles.chipIdle]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}>
      <AppText variant="item" weight={selected ? 'semibold' : 'medium'} color={selected ? 'onDark' : 'ink'}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function ChipRow({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <View style={styles.fieldBlock}>
      {label && (
        <AppText variant="label" weight="bold">
          {label}
        </AppText>
      )}
      <View style={styles.chipRow} accessibilityRole="radiogroup">
        {children}
      </View>
    </View>
  );
}

// --- Dialect card (two per row) ------------------------------------------------------------------

type DialectCardProps = { title: string; example: string; selected: boolean; onPress: () => void };

export function DialectCard({ title, example, selected, onPress }: DialectCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.dialectCard, selected ? styles.dialectSelected : styles.dialectIdle]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}>
      <AppText variant="item" weight="bold">
        {title}
      </AppText>
      <AppText variant="body" color="muted">
        {example}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logo: {
    width: size.bannerIcon,
    height: size.bannerIcon,
    borderRadius: radius.control,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashes: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dash: {
    width: size.stepDash,
    height: spacing.xs + spacing.xxs,
    borderRadius: radius.pill,
    backgroundColor: colors.line,
  },
  dashActive: {
    backgroundColor: colors.ink,
  },
  fieldBlock: {
    gap: spacing.sm,
  },
  input: {
    minHeight: size.button + spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.card,
    borderWidth: size.border,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontFamily: fonts.regular,
    fontSize: fontSize.item,
    textAlign: START_ALIGN,
  },
  emailField: {
    direction: 'rtl', // same look in every language: «تعديل» on the right, the email filling the rest
    minHeight: size.button + spacing.md,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: radius.card,
    borderWidth: size.border,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  emailEdit: {
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  emailInput: {
    flex: 1,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
  },
  emailText: {
    color: colors.ink,
    fontFamily: fonts.regular,
    fontSize: fontSize.item,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  emailReadOnly: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  ltrText: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  codeRow: {
    direction: 'ltr', // first digit on the left, like the number itself
    flexDirection: 'row',
    gap: spacing.sm,
  },
  codeBox: {
    flex: 1, // six boxes share the width
    maxWidth: size.codeBox,
    height: size.codeBox,
    borderRadius: radius.card,
    borderWidth: size.border,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxActive: {
    borderWidth: size.borderThick,
    borderColor: colors.accent,
  },
  codeBoxError: {
    borderWidth: size.borderThick,
    borderColor: colors.danger,
  },
  codeBoxDisabled: {
    backgroundColor: colors.ground,
  },
  codeInput: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    start: 0,
    end: 0,
    opacity: 0.01, // invisible, but still takes taps and auto-fill
    color: colors.surface,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minHeight: size.button - spacing.xs,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
  },
  chipSelected: {
    backgroundColor: colors.ink,
  },
  chipIdle: {
    backgroundColor: colors.surface,
    borderWidth: size.border,
    borderColor: colors.line,
  },
  dialectCard: {
    flexBasis: layout.twoColumnBasis,
    flexGrow: 1,
    gap: spacing.xxs,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  dialectSelected: {
    borderWidth: size.borderThick,
    borderColor: colors.ink,
  },
  dialectIdle: {
    borderWidth: size.border,
    borderColor: colors.line,
  },
});

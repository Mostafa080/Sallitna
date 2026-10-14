import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import type { Member } from '@/data/fakeHousehold';
import { colors, radius, size, spacing } from '@/theme';

type Ring = keyof typeof colors;

type Props = {
  member: Pick<Member, 'display_name' | 'initial' | 'avatar_color'>;
  small?: boolean;
  large?: 'list' | 'hero'; // bigger avatars on the family screens
  ring?: Ring; // outline color — match whatever the avatar sits on
};

// Light avatar backgrounds get dark text, everything else gets white text
const LIGHT_BACKGROUNDS: (keyof typeof colors)[] = ['line', 'ground', 'surface', 'accentTint'];

export function Avatar({ member, small, large, ring = 'ground' }: Props) {
  const diameter = small
    ? size.avatarSmall
    : large === 'hero'
      ? size.avatarHero
      : large === 'list'
        ? size.avatarLarge
        : size.avatar;
  const textVariant = small ? 'caption' : large === 'hero' ? 'title' : large === 'list' ? 'item' : 'body';
  const textColor = LIGHT_BACKGROUNDS.includes(member.avatar_color) ? 'ink' : 'onDark';

  return (
    <View
      accessibilityLabel={member.display_name}
      style={[
        styles.circle,
        {
          width: diameter,
          height: diameter,
          borderWidth: small ? size.border : size.borderThick,
          backgroundColor: colors[member.avatar_color],
          borderColor: colors[ring],
        },
      ]}>
      <AppText variant={textVariant} weight="bold" color={textColor} style={styles.initial}>
        {member.initial}
      </AppText>
    </View>
  );
}

type StackProps = {
  members: Member[];
  small?: boolean;
  ring?: Ring;
};

// Overlapping row of avatars; the first member sits on top.
export function AvatarStack({ members, small, ring }: StackProps) {
  const overlap = small ? spacing.xs + spacing.xxs : spacing.sm + spacing.xxs;

  return (
    <View style={styles.stack}>
      {members.map((member, index) => (
        <View key={member.id} style={{ zIndex: members.length - index, marginStart: index === 0 ? 0 : -overlap }}>
          <Avatar member={member} small={small} ring={ring} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    textAlign: 'center',
    includeFontPadding: false,
  },
  stack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

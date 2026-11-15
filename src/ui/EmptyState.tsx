import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Card } from './Card';
import { Text } from './Text';
import { colors, radius, space } from './tokens';

type EmptyStateProps = {
  Icon: LucideIcon;
  title: string;
  body?: string;
};

export function EmptyState({ Icon, title, body }: EmptyStateProps) {
  return (
    <Card style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xxxl }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: radius.lg,
          backgroundColor: colors.raised,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={28} strokeWidth={1.8} color={colors.accent} />
      </View>
      <Text variant="heading" align="center">
        {title}
      </Text>
      {body ? (
        <Text color="textMuted" align="center">
          {body}
        </Text>
      ) : null}
    </Card>
  );
}
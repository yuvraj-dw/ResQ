import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../../../config/theme';
import { ONBOARDING_DATA } from '../../../utils/constants';
import Button from '../../../components/Button';
import storageService from '../../../services/storage/StorageService';

const { width } = Dimensions.get('window');

interface OnboardingScreenProps {
  navigation: any;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      handleGetStarted();
    }
  };

  const handleGetStarted = async () => {
    await storageService.setOnboardingStatus(true);
    navigation.replace('AuthOptions');
  };

  const handleSkip = async () => {
    await storageService.setOnboardingStatus(true);
    navigation.replace('AuthOptions');
  };

  const renderItem = ({ item }: { item: typeof ONBOARDING_DATA[0] }) => (
    <View style={styles.slide}>
      <View style={styles.iconContainer}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconEmoji}>
            {item.id === '1' ? '🆘' : item.id === '2' ? '📍' : item.id === '3' ? '📡' : '🤝'}
          </Text>
        </View>
      </View>
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideDescription}>{item.description}</Text>
    </View>
  );

  const isLastSlide = currentIndex === ONBOARDING_DATA.length - 1;

  return (
    <View style={styles.container}>
      <View style={styles.skipContainer}>
        {!isLastSlide && (
          <Button
            title="Skip"
            onPress={handleSkip}
            variant="ghost"
            size="sm"
          />
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={ONBOARDING_DATA}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        bounces={false}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {ONBOARDING_DATA.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.activeDot,
              ]}
            />
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title={isLastSlide ? 'Get Started' : 'Next'}
            onPress={handleNext}
            variant="primary"
            size="lg"
            fullWidth
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  skipContainer: {
    alignItems: 'flex-end',
    padding: spacing.lg,
    paddingTop: spacing.xxl,
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    marginBottom: spacing.xxl,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.emergency + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 56,
  },
  slideTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  slideDescription: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.round,
    backgroundColor: colors.border,
  },
  activeDot: {
    width: 24,
    backgroundColor: colors.emergency,
    borderRadius: borderRadius.round,
  },
  buttonContainer: {
    marginBottom: spacing.md,
  },
});

export default OnboardingScreen;

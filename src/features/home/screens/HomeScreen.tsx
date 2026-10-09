import { RegionSelector } from "@/features/explore/components/RegionSelector";
import { RecentPlaces } from "@/features/library/components/RecentPlaces";
import { PlaceCard } from "@/features/places/components/PlaceCard";
import { formatDate, formatTimestamp } from "@/shared/i18n/format";
import { useI18n } from "@/shared/i18n/useI18n";
import { useTheme } from "@/shared/theme/useTheme";
import { Button } from "@/shared/ui/Button";
import { Screen } from "@/shared/ui/Screen";
import { Section } from "@/shared/ui/Section";
import { Text } from "@/shared/ui/Text";
import { router } from "expo-router";
import { View } from "react-native";
import { useHome } from "../hooks/useHome";
export default function HomeScreen() {
  const { t, language } = useI18n();
  const home = useHome();
  const { colors, spacing, radius } = useTheme();
  return (
    <Screen>
      {home.dataResetError && (
        <>
          <Text tone="danger" accessibilityRole="alert">
            {t("settings.deleteFailed")}
          </Text>
          <Button
            label={t("settings.localData")}
            onPress={() => router.navigate("/settings")}
          />
        </>
      )}
      {home.dataResetCompleted && (
        <Text accessibilityRole="alert" accessibilityLiveRegion="polite">
          {t("settings.deleted")}
        </Text>
      )}
      <View
        style={{
          gap: spacing.lg,
          padding: spacing.lg,
          backgroundColor: colors.selected,
          borderRadius: radius.card,
        }}
      >
        <Text variant="caption" tone="accent">
          {t("app.tagline")}
        </Text>
        <Text variant="title" accessibilityRole="header">
          {t("home.title")}
        </Text>
        <Text tone="muted">{t("home.description")}</Text>
        <Button label={t("home.explore")} onPress={home.openSearch} />
        <Button
          label={t("home.trips")}
          variant="secondary"
          onPress={() => router.navigate("/trips")}
        />
      </View>
      <Section title={t("home.continue")}>
        {home.trip ? (
          <>
            <Text variant="heading">{home.trip.name}</Text>
            <Text>
              {t("trip.dateRange", {
                start: formatDate(home.trip.startDate, language),
                end: formatDate(home.trip.endDate, language),
              })}
            </Text>
            <Text>{t("trip.itemCount", { count: home.itemCount })}</Text>
            <Button
              label={t("trip.openName", { name: home.trip.name })}
              onPress={() =>
                router.push({
                  pathname: "/trips/[tripId]",
                  params: { tripId: home.trip?.id ?? "" },
                })
              }
            />
          </>
        ) : (
          <>
            <Text tone="muted">{t("home.noNextTrip")}</Text>
            <Button
              label={t("trips.create")}
              onPress={() => router.push("/trips/new")}
            />
          </>
        )}
        <Text tone="muted">{t("home.offlineHint")}</Text>
      </Section>
      <Section title={t("home.regions")}>
        <RegionSelector value={home.region} onChange={home.setRegion} />
        <Button label={t("home.browseRegion")} onPress={home.browseRegion} />
      </Section>
      <Section title={t("home.curations")}>
        <Text tone="muted">{t("home.curationHint")}</Text>
        {home.curations.map((item) => (
          <Section key={item.place.id} title={t(`home.theme.${item.theme}`)}>
            <Text>{t(`home.theme.${item.theme}Description`)}</Text>
            <PlaceCard
              place={item.place}
              regionLabel={item.place.address ?? t("explore.regionUnknown")}
              onPress={() =>
                router.push({
                  pathname: "/places/[placeId]",
                  params: { placeId: item.place.id },
                })
              }
            />
            <Text variant="caption" tone="muted">
              {t("home.verified", {
                value: formatTimestamp(item.verifiedAt, language),
              })}
            </Text>
          </Section>
        ))}
      </Section>
      <RecentPlaces />
    </Screen>
  );
}

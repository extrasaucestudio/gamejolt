<script lang="ts">
import { setup } from 'vue-class-component';
import { Options } from 'vue-property-decorator';
import { numberSort } from '../../../../../utils/array';
import { Api } from '../../../../../_common/api/api.service';
import { Game } from '../../../../../_common/game/game.model';
import { BaseRouteComponent, OptionsForRoute } from '../../../../../_common/route/route-component';
import { useCommonStore } from '../../../../../_common/store/common-store';
import { AppTimeAgo } from '../../../../../_common/time/ago/ago';
import AppTimelineListItem from '../../../../../_common/timeline-list/item/item.vue';
import AppTimelineList from '../../../../../_common/timeline-list/timeline-list.vue';
import { UserGameTrophy } from '../../../../../_common/user/trophy/game-trophy.model';
import { UserSiteTrophy } from '../../../../../_common/user/trophy/site-trophy.model';
import { populateTrophies } from '../../../../../_common/user/trophy/trophy-utils';
import { UserBaseTrophy } from '../../../../../_common/user/trophy/user-base-trophy.model';
import { TrophyModal } from '../../../../components/trophy/modal/modal.service';
import AppTrophyThumbnail from '../../../../components/trophy/thumbnail/thumbnail.vue';
import { useProfileRouteController } from '../../profile.vue';

type TrophyEntry = {
	gameId?: number;
	game?: Game;
	trophies: UserBaseTrophy[];
};

@Options({
	name: 'RouteProfileTrophiesOverview',
	components: {
		AppTimelineList,
		AppTimelineListItem,
		AppTimeAgo,
		AppTrophyThumbnail,
	},
})
@OptionsForRoute({
	deps: {},
	resolver: ({ route }) =>
		Api.sendRequest('/web/profile/trophies/overview/@' + route.params.username),
})
export default class RouteProfileTrophiesOverview extends BaseRouteComponent {
	routeStore = setup(() => useProfileRouteController()!);
	commonStore = setup(() => useCommonStore());

	trophyEntries: TrophyEntry[] = [];

	canLoadMore = false;
	isLoadingMore = false;
	pageSize?: number;

	get user() {
		return this.routeStore.user;
	}

	get app() {
		return this.commonStore;
	}

	get routeTitle() {
		if (this.user) {
			return this.$gettextInterpolate(`@%{ user }'s Trophy Case`, {
				user: this.user.username,
			});
		}
		return null;
	}

	get hasTrophies() {
		return this.trophyEntries.length > 0;
	}

	get isDev() {
		return this.app.user && this.app.user.is_developer;
	}

	get isLoggedInUser() {
		return this.user && this.app.user && this.app.user.id === this.user.id;
	}

	routeResolved(payload: any) {
		this.pageSize = payload.pageSize;

		let trophies: UserBaseTrophy[] = [];
		if (payload.trophies) {
			trophies = populateTrophies(payload.trophies);
		}

		if (trophies.length === 0) {
			this.canLoadMore = false;
		} else {
			for (const userTrophy of trophies) {
				this.insertTrophy(userTrophy);
			}
			this.sortEntries();
			this.updateCanLoadMore(trophies);
		}
	}

	/**
	 * Group the trophies into feed entries:
	 * Each entry is a group of trophies of the same origin (same game or site).
	 * It also creates a new entry if the difference between achieved trophies is larger than 24 hours.
	 */
	private insertTrophy(userTrophy: UserBaseTrophy) {
		// Set the game/id for this user trophy (undefined for site trophies)
		let game: Game | undefined = undefined;
		let gameId: number | undefined = undefined;
		if (userTrophy instanceof UserGameTrophy) {
			game = userTrophy.game;
			gameId = userTrophy.game_id;
		}
		// Find the previous entry for that game
		let entry = this.trophyEntries
			.slice()
			.reverse()
			.find(i => i.gameId === gameId);
		// If we have a previous entry, either append the trophy,
		// or if the entry was too long ago (more than 24 hours), unset the entry to create a new one afterwards.
		if (entry) {
			const firstTrophy = entry.trophies[0];
			if (Math.abs(firstTrophy.logged_on - userTrophy.logged_on) > 24 * 60 * 60 * 1000) {
				entry = undefined;
			} else {
				entry.trophies.push(userTrophy);
			}
		}
		// Create a new entry if none exist for this game/trophy
		if (!entry) {
			entry = { game, gameId, trophies: [userTrophy] };
			this.trophyEntries.push(entry);
		}
	}

	private updateCanLoadMore(loadedTrophies: UserBaseTrophy[]) {
		// We have to receive a page size from the api to be able to load more.
		if (!this.pageSize) {
			this.canLoadMore = false;
			return;
		}

		// When we have less than the page size in new trophies for both game AND site trophies,
		// we know there are no new trophies to load at all.
		const loadedGameTrophies = loadedTrophies.filter(i => i instanceof UserGameTrophy);
		const loadedSiteTrophies = loadedTrophies.filter(i => i instanceof UserSiteTrophy);
		if (
			loadedGameTrophies.length < this.pageSize &&
			loadedSiteTrophies.length < this.pageSize
		) {
			this.canLoadMore = false;
			return;
		}

		const allTrophies = this.trophyEntries.flatMap(i => i.trophies);
		const gameTrophies = allTrophies.filter(i => i instanceof UserGameTrophy);
		const siteTrophies = allTrophies.filter(i => i instanceof UserSiteTrophy);

		// For either trophy type:
		// When we have more than 0 new trophies and more than 0 total,
		// and the total number of trophies are divisible by the page size,
		// we can assume that there are more trophies to load.
		// This would show the load more button if there are exactly 0 new trophies to load,
		// but in that case it would load no new trophies and the above condition would hide the button afterwards.
		this.canLoadMore =
			(loadedGameTrophies.length > 0 &&
				gameTrophies.length > 0 &&
				gameTrophies.length % this.pageSize === 0) ||
			(loadedSiteTrophies.length > 0 &&
				siteTrophies.length > 0 &&
				siteTrophies.length % this.pageSize === 0);
	}

	private sortEntries() {
		this.trophyEntries = this.trophyEntries.sort((a, b) =>
			numberSort(b.trophies[0].logged_on, a.trophies[0].logged_on)
		);
	}

	onClickTrophy(userTrophy: UserBaseTrophy) {
		TrophyModal.show(userTrophy);
	}

	async onClickShowMore() {
		if (!this.user || !this.canLoadMore) {
			return;
		}

		this.isLoadingMore = true;

		let url = '/web/profile/trophies/overview/@' + this.user.username;

		// Find the oldest game and site trophy to use as scroll
		let oldestGameTrophy: UserGameTrophy | null = null,
			oldestSiteTrophy: UserSiteTrophy | null = null;

		const allTrophies = this.trophyEntries.flatMap(i => i.trophies);

		for (const userTrophy of allTrophies) {
			if (userTrophy instanceof UserGameTrophy) {
				if (!oldestGameTrophy || oldestGameTrophy.logged_on > userTrophy.logged_on) {
					oldestGameTrophy = userTrophy;
				}
			} else if (userTrophy instanceof UserSiteTrophy) {
				if (!oldestSiteTrophy || oldestSiteTrophy.logged_on > userTrophy.logged_on) {
					oldestSiteTrophy = userTrophy;
				}
			}
		}

		if (oldestGameTrophy) {
			url += `?game-scroll=${oldestGameTrophy.logged_on}`;
		}
		if (oldestSiteTrophy) {
			url += oldestGameTrophy ? '&' : '?';
			url += `site-scroll=${oldestSiteTrophy.logged_on}`;
		}

		const payload = await Api.sendRequest(url);

		let trophies: UserBaseTrophy[] = [];
		if (payload.trophies) {
			trophies = populateTrophies(payload.trophies);
		}

		if (trophies.length === 0) {
			this.canLoadMore = false;
		} else {
			for (const userTrophy of trophies) {
				this.insertTrophy(userTrophy);
			}
			this.sortEntries();
			this.updateCanLoadMore(trophies);
		}

		this.isLoadingMore = false;
	}
}
</script>

<template>
	<div>
		<div v-if="!hasTrophies" class="alert alert-info">
			<span>
				<AppTranslate>This user has not achieved any trophies ... yet.</AppTranslate>
			</span>
		</div>

		<AppTimelineList v-else>
			<div v-for="entry of trophyEntries" :key="entry.trophies[0].key">
				<AppTimelineListItem>
					<template #bubble>
						<div class="-timeline-icon">
							<AppJolticon v-if="entry.game" icon="trophy" />
							<AppJolticon v-else icon="gamejolt" />
						</div>
					</template>

					<div>
						<div class="timeline-list-item-title">
							<template v-if="entry.game">
								<template v-if="entry.trophies.length === 1">
									Achieved 1 trophy for the game
									<router-link
										:to="{
											name: 'profile.trophies.game',
											params: {
												id: entry.game.id,
											},
										}"
									>
										{{ entry.game.title }}
									</router-link>
								</template>
								<template v-else>
									Achieved {{ entry.trophies.length }} trophies for the game
									<router-link
										:to="{
											name: 'profile.trophies.game',
											params: {
												id: entry.game.id,
											},
										}"
									>
										{{ entry.game.title }}
									</router-link>
								</template>
							</template>
							<template v-else>
								<template v-if="entry.trophies.length === 1">
									Achieved 1
									<router-link :to="{ name: 'profile.trophies.site' }">
										Game Jolt Trophy
									</router-link>
								</template>
								<template v-else>
									Achieved {{ entry.trophies.length }}
									<router-link :to="{ name: 'profile.trophies.site' }">
										Game Jolt Trophies
									</router-link>
								</template>
							</template>
						</div>
					</div>

					<div class="timeline-list-item-meta">
						<AppTimeAgo :date="entry.trophies[0].logged_on" />
					</div>

					<div class="timeline-list-item-details">
						<div class="timeline-list-item-content">
							<AppTrophyThumbnail
								v-for="userTrophy of entry.trophies"
								:key="userTrophy.id"
								class="-trophy-thumb"
								:trophy="userTrophy.trophy"
								:no-highlight="isLoggedInUser"
								@click="onClickTrophy(userTrophy)"
							/>
						</div>
					</div>
				</AppTimelineListItem>
				<div class="timeline-list-item-split" />
			</div>
			<p>
				<AppButton v-if="canLoadMore" :disabled="isLoadingMore" @click="onClickShowMore">
					<AppTranslate>Show More</AppTranslate>
				</AppButton>
				<router-link
					:to="{
						name: 'profile.trophies.all',
					}"
				>
					<AppButton>
						<AppTranslate>View all trophies</AppTranslate>
					</AppButton>
				</router-link>
			</p>
			<p v-if="isDev" class="-dev-trophy-link small">
				<AppLinkHelp page="dev-trophies" class="link-help">
					<AppTranslate>Learn how to integrate trophies into YOUR game!</AppTranslate>
				</AppLinkHelp>
			</p>
		</AppTimelineList>
	</div>
</template>

<style lang="stylus" scoped>
.-level-widget
	max-width: 340px
	width: 100%
	margin-right: 20px

.-trophy-header
	margin-bottom: 4px

.-dev-trophy-link
	margin-bottom: 24px

// Used to center the icon
::v-deep(.timeline-list-item-bubble-inner)
.timeline-list-item-bubble-inner > div
	position: relative
	height: 100%

.-timeline-icon
	display: flex
	position: relative
	height: 100%
	justify-content: center
	align-items: center

.-trophy-thumb
	display: inline-block
	width: 80px
	margin-right: 10px
	margin-bottom: 10px
	cursor: pointer

.-exp
	display: flex

	@media $media-xs
		flex-direction: column

		.-level-widget
			margin: 0
</style>

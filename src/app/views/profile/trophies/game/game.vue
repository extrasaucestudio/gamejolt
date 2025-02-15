<script lang="ts">
import { setup } from 'vue-class-component';
import { Options } from 'vue-property-decorator';
import { RouteLocationRedirect } from '../../../../../utils/router';
import { Api } from '../../../../../_common/api/api.service';
import { Game } from '../../../../../_common/game/game.model';
import AppGameThumbnail from '../../../../../_common/game/thumbnail/AppGameThumbnail.vue';
import { BaseRouteComponent, OptionsForRoute } from '../../../../../_common/route/route-component';
import { useCommonStore } from '../../../../../_common/store/common-store';
import { populateTrophies } from '../../../../../_common/user/trophy/trophy-utils';
import { UserBaseTrophy } from '../../../../../_common/user/trophy/user-base-trophy.model';
import AppTrophyCard from '../../../../components/trophy/card/card.vue';
import AppTrophyCompletion from '../../../../components/trophy/completion/completion.vue';
import AppTrophyListPaged from '../../../../components/trophy/list/paged/paged.vue';
import { useProfileRouteController } from '../../profile.vue';

type CompletionData = {
	experience: number;
	totalCount: number;
	achievedCount: number;
};

@Options({
	name: 'RouteProfileTrophiesGame',
	components: {
		AppTrophyCard,
		AppTrophyListPaged,
		AppTrophyCompletion,
		AppGameThumbnail,
	},
})
@OptionsForRoute({
	deps: { params: ['id'] },
	async resolver({ route }) {
		const payload = await Api.sendRequest(
			'/web/profile/trophies/game/@' + route.params.username + '/' + route.params.id
		);

		// If the game doesn't have any trophies or the user has not achieved any for this game, redirect to their overview.
		// This is to prevent showing an empty game page with no entry in the left nav.
		if (!payload.trophies || payload.trophies.length === 0) {
			const redirect = new RouteLocationRedirect({
				name: 'profile.trophies',
			});
			return redirect;
		}

		return payload;
	},
})
export default class RouteProfileTrophiesGame extends BaseRouteComponent {
	routeStore = setup(() => useProfileRouteController()!);
	commonStore = setup(() => useCommonStore());

	game: Game | null = null;
	trophies: UserBaseTrophy[] = [];
	completion: CompletionData | null = null;

	get user() {
		return this.routeStore.user;
	}

	get app() {
		return this.commonStore;
	}

	get routeTitle() {
		if (this.user && this.game) {
			return this.$gettextInterpolate(
				`@%{ user }'s achieved Trophies for the game %{ title }`,
				{
					user: this.user.username,
					title: this.game.title,
				}
			);
		}
		return null;
	}

	get listLoadMoreUrl() {
		if (this.game) {
			return `/web/profile/trophies/game/@${this.user!.username}/${this.game.id}`;
		}
		return undefined;
	}

	get isLoggedInUser() {
		return this.user && this.app.user && this.app.user.id === this.user.id;
	}

	routeResolved(payload: any) {
		this.game = new Game(payload.game);
		if (payload.trophies) {
			this.trophies = populateTrophies(payload.trophies);
		}
		if (payload.completion) {
			this.completion = payload.completion;
		}
	}
}
</script>

<template>
	<div>
		<div v-if="game" class="row">
			<div class="col-sm-7">
				<AppTrophyCompletion
					v-if="completion"
					class="-completion"
					:total="completion.totalCount"
					:achieved="completion.achievedCount"
					:experience="completion.experience"
					:is-logged-in-user="isLoggedInUser"
				/>
				<p>
					<AppButton :to="game.routeLocation">
						<AppTranslate>View Game</AppTranslate>
					</AppButton>
					<AppButton
						:to="{
							name: 'discover.games.view.trophies.list',
							params: game.getSrefParams(),
						}"
					>
						<AppTranslate>View All Trophies</AppTranslate>
					</AppButton>
				</p>
			</div>
			<div class="col-sm-5 hidden-xs">
				<AppGameThumbnail class="-game-thumbnail" :game="game" />
			</div>
		</div>
		<hr class="hidden-xs" />
		<AppTrophyListPaged :initial-trophies="trophies" :url="listLoadMoreUrl" />
	</div>
</template>

<style lang="stylus" scoped>
.-game-thumbnail
	margin-bottom: 0
</style>

<script lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import AppAlertDismissable from '../../../../_common/alert/dismissable/dismissable.vue';
import AppJolticon from '../../../../_common/jolticon/AppJolticon.vue';
import { createAppRoute, defineAppRouteOptions } from '../../../../_common/route/route-component';
import AppTranslate from '../../../../_common/translate/AppTranslate.vue';
import { $gettext } from '../../../../_common/translate/translate.service';
import AppPageHeader from '../../../components/page-header/page-header.vue';
import { useClientLibraryStore } from '../../../store/client-library/index';
import AppLibraryInstalledGame from './AppLibraryInstalledGame.vue';

export default {
	...defineAppRouteOptions({}),
};
</script>

<script lang="ts" setup>
const { games } = useClientLibraryStore();

const gamesByTitle = computed(() => {
	return [...games.value].sort((a, b) =>
		a.title.toLowerCase().localeCompare(b.title.toLowerCase())
	);
});

createAppRoute({
	routeTitle: computed(() => $gettext(`Installed Games`)),
});
</script>

<template>
	<div>
		<AppPageHeader>
			<h1><AppTranslate>Installed Games</AppTranslate></h1>
			<br />
		</AppPageHeader>

		<section class="section">
			<div class="container">
				<AppAlertDismissable alert-type="info" dismiss-key="library.install-location-msg">
					<AppJolticon icon="info-circle" middle />
					{{ ' ' }}
					<AppTranslate
						translate-comment="Short message to remind them that they can change install location at any time in their settings."
					>
						You can change the location where games are installed at any time in your
						settings.
					</AppTranslate>
					{{ ' ' }}
					<RouterLink :to="{ name: 'dash.account.device-settings' }">
						<AppTranslate>Go to Settings?</AppTranslate>
					</RouterLink>
				</AppAlertDismissable>

				<div v-if="!games.length" class="alert alert-notice">
					<AppTranslate
						translate-comment="The message shown when there are no games installed yet in their library."
					>
						Your installed games show up here... that is, once you have some!
					</AppTranslate>
				</div>
				<div v-else class="row">
					<div v-for="game of gamesByTitle" :key="game.id" class="col-md-6 col-lg-4">
						<AppLibraryInstalledGame :game="game" />
					</div>
				</div>
			</div>
		</section>
	</div>
</template>

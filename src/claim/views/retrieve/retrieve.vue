<script lang="ts">
import { Options } from 'vue-property-decorator';
import { Api } from '../../../_common/api/api.service';
import { GameBundle } from '../../../_common/game-bundle/game-bundle.model';
import { Game } from '../../../_common/game/game.model';
import { Meta } from '../../../_common/meta/meta-service';
import { BaseRouteComponent, OptionsForRoute } from '../../../_common/route/route-component';
import AppInvalidKey from '../../components/AppInvalidKey.vue';
import FormRetrieve from '../../components/forms/FormRetrieve.vue';

interface SuccessPayload {
	error: false;
	type: 'game' | 'bundle';
	key: string;
	payload?: any;
}

interface ErrorPayload {
	error: true;
}

type Payload = SuccessPayload | ErrorPayload | undefined;

@Options({
	name: 'RouteRetrieve',
	components: {
		FormRetrieve,
		AppInvalidKey,
	},
})
@OptionsForRoute({
	async resolver({ route }): Promise<Payload> {
		let type: 'game' | 'bundle' | undefined;
		let key = '';

		// Retrieving all keys. We don't need to call the API.
		if (!route.params.input) {
			return undefined;
		}

		const matches = route.params.input.match(/(g|b)-([0-9a-zA-Z]+)/);
		if (matches) {
			if (matches[1] === 'g') {
				type = 'game';
			} else if (matches[1] === 'b') {
				type = 'bundle';
			}
		}

		// Invalid key passed in.
		if (!matches || !type) {
			return { error: true };
		}

		key = matches[2];

		// Retrieving a key for a particular bundle or game.
		return {
			error: false,
			type,
			key,
			payload: await Api.sendRequest(`/claim/retrieve/${type}/${key}`),
		};
	},
})
export default class RouteRetrieve extends BaseRouteComponent {
	invalidKey = false;
	key = '';
	bundle: GameBundle | null = null;
	game: Game | null = null;
	resourceTitle = '';

	readonly Meta = Meta;

	get routeTitle() {
		if (this.resourceTitle) {
			return this.$gettextInterpolate(`Retrieve Your Keys for %{ resource }`, {
				resource: this.resourceTitle,
			});
		}

		return this.$gettext(`Retrieve Your Keys`);
	}

	routeResolved($payload: Payload) {
		// Invalid key.
		if ($payload && ($payload.error || $payload.payload.error)) {
			this.invalidKey = true;
			return;
		}

		// Retrieving a key for a particular bundle or game.
		if ($payload && !$payload.error) {
			const {
				key,
				payload: { bundle, game },
			} = $payload;
			this.key = key;
			this.bundle = bundle ? new GameBundle(bundle) : null;
			this.game = game ? new Game(game) : null;
		}

		this.resourceTitle = '';
		if (this.bundle) {
			this.resourceTitle = this.bundle.title;
		} else if (this.game) {
			this.resourceTitle = this.game.title;
		}
	}

	onSubmit() {
		this.$router.push({ name: 'sent-key' });
	}
}
</script>

<template>
	<div>
		<AppInvalidKey v-if="invalidKey" />

		<section v-else class="container">
			<h1 class="section-header">
				<AppTranslate v-if="!resourceTitle"> Retrieve Your Keys </AppTranslate>
				<AppTranslate v-else :translate-params="{ resource: resourceTitle }">
					Retrieve Your Keys for %{ resource }
				</AppTranslate>
			</h1>

			<p>
				<template v-if="!resourceTitle">
					<AppTranslate>
						Please enter your email address to retrieve your keys.
					</AppTranslate>
				</template>
				<template v-if="resourceTitle">
					<span v-translate="{ resource: resourceTitle }">
						Please enter your email address to retrieve your keys for
						<b>%{ resource }</b>
						.
					</span>
				</template>
				{{ ' ' }}
				<AppTranslate>We will email you a link to your download(s).</AppTranslate>
			</p>

			<FormRetrieve :key-id="key" :bundle="bundle" :game="game" @submit="onSubmit" />
		</section>
	</div>
</template>

<script lang="ts">
import { Emit, Options, Prop, Vue } from 'vue-property-decorator';
import AppRatingWidget, {
	onRatingWidgetChange,
} from '../../../app/components/rating/widget/widget.vue';
import { useEventSubscription } from '../../system/event/event-topic';
import { Game } from '../game.model';

@Options({
	components: {
		AppRatingWidget,
	},
})
export default class AppGameRatingGrowl extends Vue {
	@Prop({ type: Object, required: true })
	game!: Game;

	@Emit('close')
	emitClose() {}

	created() {
		// Close the modal as soon as they rate the game. We set up on $on event
		// so that we get notified even if they rate the game from the game page
		// and not the modal.
		useEventSubscription(onRatingWidgetChange, payload => {
			if (payload.gameId === this.game.id) {
				this.emitClose();
			}
		});
	}
}
</script>

<template>
	<div>
		<h4>
			<AppTranslate>What did you think?</AppTranslate>
		</h4>

		<p>{{ game.title }}</p>

		<div>
			<AppRatingWidget :game="game" />
		</div>

		<br />

		<p>
			<em>
				<AppTranslate>Rating the games you play helps us show you better stuff.</AppTranslate>
			</em>
		</p>
	</div>
</template>

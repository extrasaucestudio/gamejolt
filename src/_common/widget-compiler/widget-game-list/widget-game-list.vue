<script lang="ts">
import { Options, Prop, Vue } from 'vue-property-decorator';
import { Environment } from '../../environment/environment.service';
import { Game } from '../../game/game.model';
import AppGameThumbnailImg from '../../game/thumbnail/AppGameThumbnailImg.vue';
import { WidgetCompiler } from '../widget-compiler.service';

@Options({
	components: {
		AppGameThumbnailImg,
	},
})
export default class AppWidgetCompilerWidgetGameList extends Vue {
	@Prop({ type: Array, default: () => [] })
	games!: Game[];

	get contentClass() {
		return WidgetCompiler.getContentClass();
	}

	url(game: Game) {
		return game.site ? game.site.url : Environment.baseUrl + game.getUrl();
	}
}
</script>

<template>
	<div class="widget-compiler-widget-game-list" :class="contentClass">
		<div class="-game-list">
			<a v-for="game of games" :key="game.id" class="-game" :href="url(game)">
				<AppGameThumbnailImg animate :game="game" />
				<div class="-title">{{ game.title }}</div>
			</a>
		</div>
	</div>
</template>

<style lang="stylus" scoped>
.-game-list
	text-align: center

	@media $media-sm-up
		margin-left: -(20px)
		margin-right: -(20px)

.-game
	display: inline-block
	vertical-align: top
	text-align: left
	width: 100%
	padding-bottom: $grid-gutter-width-xs

	@media $media-sm
		width: (100% / 2)
		padding: 0 20px 40px 20px

	@media $media-md-up
		width: (100% / 3)
		padding: 0 20px 40px 20px

.-title
	margin: 10px 0 0 0
	font-weight: bold
	font-size: 1.1em
</style>

<script lang="ts">
import { Options, Prop, Vue } from 'vue-property-decorator';
import { vAppTooltip } from '../../../tooltip/tooltip-directive';
import { User } from '../../user.model';
import AppUserVerifiedTick from '../../verified-tick/verified-tick.vue';
import AppUserAvatar from '../user-avatar.vue';

@Options({
	components: {
		AppUserAvatar,
		AppUserVerifiedTick,
	},
	directives: {
		AppTooltip: vAppTooltip,
	},
})
export default class AppUserAvatarList extends Vue {
	@Prop(Array)
	users!: User[];

	@Prop(Boolean)
	sm?: boolean;

	@Prop(Boolean)
	inline?: boolean;
}
</script>

<template>
	<div class="-list" :class="{ '-list-sm': sm, '-inline-list': inline }">
		<div
			v-for="user of users"
			:key="user.id"
			class="-user"
			:class="{
				'-user-sm': sm,
			}"
		>
			<AppUserAvatar
				v-app-tooltip="user.display_name + ' (@' + user.username + ')'"
				class="-avatar"
				:class="{
					'-avatar-sm': sm,
				}"
				:user="user"
			/>
			<AppUserVerifiedTick v-if="!sm" class="-tick" :user="user" />
		</div>
	</div>
</template>

<style lang="stylus" scoped>
$-size = 40px
$-spacing = 4px
$-size-sm = 16px

.-list
	display: grid
	grid-template-columns: repeat(auto-fill, $-size)
	grid-gap: $-spacing * 2
	justify-content: space-between

.-list-sm
	position: relative
	flex: 1
	display: flex
	flex-wrap: wrap
	padding-top: $-spacing
	padding-bottom: $-spacing
	justify-content: normal
	grid-gap: 0

.-inline-list
	display: inline-flex

.-user
	position: relative

.-user-sm
	width: $-size-sm * 0.4
	height: $-size-sm
	margin: 0 3px 3px

.-avatar
	img-circle()
	change-bg('bg-subtle')
	pressy()

.-avatar-sm
	width: $-size-sm
	height: $-size-sm

.-tick
	change-bg('bg')
	border-radius: 50%
	position: absolute
	right: 0
	bottom: 0
	pointer-events: none
</style>

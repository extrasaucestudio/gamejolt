<script lang="ts" setup>
import { defineAsyncComponent, watch } from 'vue';
import { Screen } from '../../../../_common/screen/screen-service';
import AppScrollScroller from '../../../../_common/scroll/AppScrollScroller.vue';
import AppShortkey from '../../../../_common/shortkey/AppShortkey.vue';
import { useCommonStore } from '../../../../_common/store/common-store';
import { useAppStore } from '../../../store';
import AppShellSidebarContext from './context/AppShellSidebarContext.vue';
import AppShellSidebarLibrary from './library/AppShellSidebarLibrary.vue';
import AppShellSidebarMobile from './mobile/AppShellSidebarMobile.vue';

const AppShellSidebarChat = defineAsyncComponent(() => import('./chat/AppShellSidebarChat.vue'));

const { visibleLeftPane, checkBackdrop, toggleLeftPane } = useAppStore();
const { user } = useCommonStore();

watch(
	() => Screen.isLg,
	() => {
		// Since our context pane is an overlay for breakpoints other than Lg,
		// we want to trigger this action to add or remove the backdrop as
		// needed.
		checkBackdrop();
	}
);
</script>

<template>
	<!--
	Chat handles its scrolling internally. Everything else should be wrapped in
	[AppScrollScroller].
	-->
	<Component
		:is="visibleLeftPane === 'chat' ? 'div' : AppScrollScroller"
		id="shell-sidebar"
		class="shell-pane shell-pane-left"
		thin
	>
		<AppShortkey v-if="user" shortkey="c" @press="toggleLeftPane('chat')" />
		<AppShortkey v-if="user" shortkey="m" @press="toggleLeftPane('library')" />
		<AppShortkey shortkey="y" @press="toggleLeftPane('context')" />

		<AppShellSidebarChat v-if="visibleLeftPane === 'chat'" />
		<AppShellSidebarLibrary v-else-if="visibleLeftPane === 'library'" />
		<AppShellSidebarContext v-else-if="visibleLeftPane === 'context'" />
		<AppShellSidebarMobile v-else-if="visibleLeftPane === 'mobile'" />
	</Component>
</template>

<style lang="stylus" scoped>
#shell-sidebar
	display: flex
	flex-direction: column

	hr
		margin: $line-height-computed 15px

	.tag
		margin-top: 15px

	.alert
		border-radius: 0
</style>

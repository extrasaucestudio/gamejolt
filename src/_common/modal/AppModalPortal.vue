<script lang="ts" setup>
import { computed } from 'vue';
import AppModalWrapper from './AppModalWrapper.vue';
import { Modals } from './modal.service';

const modals = computed(() => Modals.modals);
</script>

<template>
	<div class="modals">
		<AppModalWrapper v-for="(modal, index) of modals" :key="index" :modal="modal" />
	</div>
</template>

<style lang="stylus" scoped>
.modals
	position: relative
	z-index: $zindex-modal
</style>

<script lang="ts" setup>
import { computed, PropType, ref, toRefs } from 'vue';
import { Api } from '../../../../_common/api/api.service';
import { Community } from '../../../../_common/community/community.model';
import { Fireside } from '../../../../_common/fireside/fireside.model';
import AppForm, { createForm, defineFormProps } from '../../../../_common/form-vue/AppForm.vue';
import AppFormButton from '../../../../_common/form-vue/AppFormButton.vue';
import AppFormControl from '../../../../_common/form-vue/AppFormControl.vue';
import AppFormControlErrors from '../../../../_common/form-vue/AppFormControlErrors.vue';
import AppFormGroup from '../../../../_common/form-vue/AppFormGroup.vue';
import { validateMaxLength, validateMinLength } from '../../../../_common/form-vue/validators';
import { showErrorGrowl } from '../../../../_common/growls/growls.service';
import AppTranslate from '../../../../_common/translate/AppTranslate.vue';
import { $gettext } from '../../../../_common/translate/translate.service';
import AppFormsCommunityPillAdd from '../community/_pill/add/add.vue';
import AppFormsCommunityPill from '../community/_pill/community-pill.vue';

type FormModel = {
	title: string;
	community_id: number | null;
	auto_feature: boolean;
	add_community_as_cohosts: boolean;
};

const props = defineProps({
	community: { type: Object as PropType<Community>, default: null },
	...defineFormProps<FormModel>(false),
});

const emit = defineEmits({
	submit: (_fireside: Fireside) => true,
});

const { community, model } = toRefs(props);

const canSelectCommunity = computed(() => selectableCommunities.value.length > 0);

const selectableCommunities = computed(() => communities.value.filter(c => !c.isBlocked));

const selectedCommunity = computed(() => {
	if (!form.formModel.community_id) {
		return undefined;
	}
	return communities.value.find(c => c.id === form.formModel.community_id);
});

const defaultTitle = computed(() => nameSuggestion.value ?? undefined);
const nameSuggestion = ref<string | null>(null);
const communities = ref<Community[]>([]);

const loadUrl = `/web/dash/fireside/add`;

const form = createForm({
	model,
	loadUrl,
	onLoad(payload) {
		// If there is already an active fireside for the requested target, return it immediately.
		if (payload.fireside) {
			const fireside = new Fireside(payload.fireside);
			emit('submit', fireside);
			return;
		}

		if (payload.nameSuggestion) {
			nameSuggestion.value = payload.nameSuggestion;
		}

		if (payload.targetableCommunities) {
			communities.value = Community.populate(payload.targetableCommunities);
		} else {
			communities.value = [];
		}
	},
	onInit() {
		form.formModel.title = '';

		if (community.value) {
			setCommunity(community.value);
		} else {
			form.formModel.community_id = null;
		}
	},
	async onSubmit() {
		const payloadData = {
			title: form.formModel.title,
			// All fireside creation should start as draft/private.
			is_draft: true,
		} as any;

		if (form.formModel.community_id) {
			payloadData['community_id'] = form.formModel.community_id;
			payloadData['auto_feature'] = form.formModel.auto_feature;
			payloadData['add_community_as_cohosts'] = form.formModel.add_community_as_cohosts;
		}

		const payload = await Api.sendRequest(loadUrl, payloadData);

		if (!payload.success) {
			if (payload.errors && payload.errors['rate-limit']) {
				showErrorGrowl(
					$gettext(`You must wait a few minutes before creating another fireside.`)
				);
				return;
			}

			showGenericError();
			return;
		}

		if (!payload.fireside) {
			showGenericError();
			return;
		}

		const fireside = new Fireside(payload.fireside);
		emit('submit', fireside);
	},
});

function showGenericError() {
	showErrorGrowl($gettext(`Couldn't create your fireside. Reload and try again.`));
}

function onBlurTitle() {
	form.formModel.title = form.formModel.title.trim();
}

function setCommunity(community: Community) {
	form.formModel.community_id = community.id;
}

function onAddCommunity(community: Community) {
	setCommunity(community);
}

function onRemoveCommunity() {
	form.formModel.community_id = null;
}
</script>

<template>
	<AppForm :controller="form">
		<AppFormGroup
			class="-group-title"
			name="title"
			:label="$gettext(`Title`)"
			tiny-label-margin
		>
			<AppFormControl
				type="text"
				:validators="[validateMinLength(4), validateMaxLength(100)]"
				:placeholder="defaultTitle"
				focus
				@blur="onBlurTitle"
			/>
			<AppFormControlErrors />
		</AppFormGroup>

		<template v-if="canSelectCommunity">
			<AppFormGroup
				class="-group-community"
				name="community_id"
				:label="$gettext(`Start in a community?`)"
				hide-label
			>
				<AppFormsCommunityPill
					v-if="selectedCommunity"
					:community="selectedCommunity"
					:with-channel="false"
					@remove="onRemoveCommunity"
				/>
				<AppFormsCommunityPillAdd
					v-else
					:communities="selectableCommunities"
					:with-channel="false"
					@add-community="onAddCommunity"
				/>

				<div class="help-block">
					<AppTranslate>
						You can start firesides in communities you collaborate on. If you do,
						community members will be notified and other collaborators can stream with
						you.
					</AppTranslate>
				</div>
			</AppFormGroup>
		</template>

		<AppFormButton icon="fireside" :disabled="!form.valid" block>
			<AppTranslate>Let's go!</AppTranslate>
		</AppFormButton>
	</AppForm>
</template>

<style lang="stylus" scoped>
.-group-title
	margin-bottom: 16px

.-group-community
	margin-bottom: 40px

.help-block
	margin-top: 8px
</style>

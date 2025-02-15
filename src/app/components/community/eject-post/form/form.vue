<script lang="ts">
import { Emit, mixins, Options, Prop, Watch } from 'vue-property-decorator';
import { Community } from '../../../../../_common/community/community.model';
import { BaseForm } from '../../../../../_common/form-vue/form.service';
import { getDatalistOptions } from '../../../../../_common/settings/datalist-options.service';
import {
	getCommunityEjectPostReasons,
	REASON_OTHER,
	REASON_SPAM,
} from '../../../../../_common/user/action-reasons';

export type FormModel = {
	notifyUser: string;
	reasonType: string | null;
	reason: string | null;
};

class Wrapper extends BaseForm<FormModel> {}

@Options({})
export default class FormCommunityEjectPost extends mixins(Wrapper) {
	@Prop({ type: Object, required: true }) community!: Community;

	@Emit('change') emitChange(_form: FormModel) {}

	otherOptions: string[] = [];

	get notifyUserOptions() {
		return {
			no: this.$gettext(`No, do not notify the user.`),
			yes: this.$gettext(`Yes, notify the user.`),
			'yes-reason': this.$gettext(`Yes, notify the user and show them the following reason.`),
		};
	}

	get defaultReasons() {
		return getCommunityEjectPostReasons();
	}

	get shouldShowReasons() {
		return this.formModel.notifyUser === 'yes-reason';
	}

	get showReasonOther() {
		return this.shouldShowReasons && this.formModel.reasonType === REASON_OTHER;
	}

	onInit() {
		this.setField('notifyUser', 'yes');
		this.setField('reasonType', REASON_SPAM);

		const options = getDatalistOptions('community-eject', this.community.id.toString());
		this.otherOptions = options.getList();
	}

	@Watch('formModel', { deep: true })
	onFormModelChange() {
		this.emitChange(this.formModel);
	}
}
</script>

<template>
	<AppForm :controller="form">
		<AppFormGroup
			name="notifyUser"
			:label="$gettext(`Do you also want to notify the author that their post got ejected?`)"
		>
			<div
				v-for="(optionDisplay, optionValue) in notifyUserOptions"
				:key="optionValue"
				class="radio"
			>
				<label>
					<AppFormControlRadio :value="optionValue" />
					{{ optionDisplay }}
				</label>
			</div>
			<AppFormControlErrors />
		</AppFormGroup>

		<AppFormGroup
			v-if="shouldShowReasons"
			name="reasonType"
			:label="$gettext('Eject reason')"
		>
			<div v-for="(reasonDisplay, reason) in defaultReasons" :key="reason" class="radio">
				<label>
					<AppFormControlRadio :value="reason" />
					{{ reasonDisplay }}
				</label>
			</div>
			<AppFormControlErrors />
		</AppFormGroup>

		<AppFormGroup v-if="showReasonOther" name="reason" hide-label>
			<div class="help-inline">
				<span v-translate>
					Enter other eject reason.
					<b>This is shown to the post author.</b>
				</span>
			</div>
			<AppFormControl
				type="text"
				html-list-id="eject-post-reasons-list"
				:validators="[validateMaxLength(100)]"
			/>
			<datalist id="eject-post-reasons-list">
				<option v-for="optionStr of otherOptions" :key="optionStr" :value="optionStr" />
			</datalist>
			<AppFormControlErrors />
		</AppFormGroup>
	</AppForm>
</template>

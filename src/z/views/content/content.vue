<script lang="ts">
import { Options } from 'vue-property-decorator';
import { Api } from '../../../_common/api/api.service';
import { ContentDocument } from '../../../_common/content/content-document';
import AppContentEditor from '../../../_common/content/content-editor/content-editor.vue';
import AppLoading from '../../../_common/loading/AppLoading.vue';
import { Navigate } from '../../../_common/navigate/navigate.service';
import { BaseRouteComponent, OptionsForRoute } from '../../../_common/route/route-component';
import { AppTimeAgo } from '../../../_common/time/ago/ago';
import { User } from '../../../_common/user/user.model';

@Options({
	name: 'RouteContent',
	components: {
		AppContentEditor,
		AppLoading,
		AppTimeAgo,
	},
})
@OptionsForRoute({
	deps: { params: ['resource', 'resource-Id'] },
	async resolver({ route }) {
		await User.touch();
		const payload = await Api.sendRequest(
			`/z/content/${route.params.resource}/${route.params.resourceId}`
		);
		return payload;
	},
})
export default class RouteContent extends BaseRouteComponent {
	isHydrated = false;
	isLoading = false;
	errors = [] as string[];

	contentJson!: string;
	contentContext!: string;
	lastEdit!: number;
	resourceTitle!: string;
	resourceUrl!: string;
	ownerName!: string;
	ownerUrl!: string;
	logReason = '';

	camelCase(str: string) {
		return str.replace(/-([a-z])/gi, function (_all, letter) {
			return ' ' + letter.toUpperCase();
		});
	}

	get title() {
		let title = this.camelCase(this.contentContext);
		title = title[0].toUpperCase() + title.substr(1);
		return title;
	}

	get canSubmit() {
		return this.logReason.length > 0;
	}

	get routeTitle() {
		if (this.isHydrated) {
			return 'Edit ' + this.title;
		}
		return null;
	}

	get hasErrors() {
		return this.errors.length > 0;
	}

	routeResolved($payload: any) {
		this.contentJson = $payload.content;
		this.contentContext = $payload.context;

		const doc = ContentDocument.fromJson(this.contentJson!);
		this.lastEdit = doc.createdOn;

		this.resourceTitle = $payload.resourceTitle;
		this.resourceUrl = $payload.resourceUrl;
		this.ownerName = $payload.ownerName;
		this.ownerUrl = $payload.ownerUrl;

		this.isHydrated = true;
	}

	onChangeLogReason() {
		const elem = document.getElementById('log-reason') as HTMLTextAreaElement;
		this.logReason = elem.value;
	}

	onUpdate(source: string) {
		this.contentJson = source;
	}

	async submit() {
		this.isLoading = true;
		const doc = ContentDocument.fromJson(this.contentJson);
		if (doc instanceof ContentDocument) {
			const contentJson = doc.toJson();
			try {
				const payload = await Api.sendRequest(
					`/z/content/save/${this.$route.params.resource}/${this.$route.params.resourceId}`,
					{ content: contentJson, log_reason: this.logReason },
					{ noErrorRedirect: true }
				);

				const redirectUrl = payload.redirectUrl;
				Navigate.gotoExternal(redirectUrl);
			} catch (e) {
				this.errors.push('Failed to save changes.');
				console.error('Error while trying to process request', e);
			} finally {
				this.isLoading = false;
			}
		}
	}
}
</script>

<template>
	<div class="main">
		<div class="content">
			<div v-if="hasErrors">
				<div v-for="error of errors" :key="error" class="error-message">
					{{ error }}
				</div>
			</div>

			<template v-if="isHydrated">
				<h2>Edit {{ title }}</h2>
				<table class="text-muted">
					<tr>
						<th><AppTranslate>Source</AppTranslate></th>
						<td>
							<a target="_blank" :href="resourceUrl">{{ resourceTitle }}</a>
						</td>
					</tr>
					<tr v-if="ownerName && ownerUrl">
						<th><AppTranslate>Owner</AppTranslate></th>
						<td>
							<a target="_blank" :href="ownerUrl">{{ ownerName }}</a>
						</td>
					</tr>
					<tr>
						<th><AppTranslate>Last edit</AppTranslate></th>
						<td>
							<AppTimeAgo :date="lastEdit" strict />
						</td>
					</tr>
				</table>

				<div class="content-container">
					<AppContentEditor
						class="content-editor-moderate"
						:value="contentJson"
						:content-context="contentContext"
						@input="onUpdate"
					/>
				</div>

				<br />

				<div class="alert alert-info">
					<AppJolticon icon="info-circle" />
					<AppTranslate>Image uploads are currently unavailable.</AppTranslate>
				</div>

				<div class="log-reason">
					<textarea
						id="log-reason"
						rows="2"
						class="log-field"
						placeholder="Reason for editing"
						:value="logReason"
						@input="onChangeLogReason"
					/>
				</div>

				<div class="controls">
					<AppButton primary solid :disabled="!canSubmit" @click="submit">
						<AppTranslate>Submit</AppTranslate>
					</AppButton>
				</div>
			</template>
			<AppLoading v-else />
		</div>

		<div v-if="isLoading" class="loading-overlay">
			<AppLoading big centered />
		</div>
	</div>
</template>

<style lang="stylus" src="./content.styl" scoped></style>

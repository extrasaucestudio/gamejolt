<script lang="ts">
import { setup } from 'vue-class-component';
import { Options } from 'vue-property-decorator';
import { Api } from '../../../../../../../_common/api/api.service';
import {
	showErrorGrowl,
	showSuccessGrowl,
} from '../../../../../../../_common/growls/growls.service';
import { ModalFacebookPageSelector } from '../../../../../../../_common/linked-account/facebook-page-selector-modal/facebook-page-selector-modal-service';
import {
	getLinkedAccountProviderDisplayName,
	LinkedAccount,
	Provider,
	TumblrBlog,
} from '../../../../../../../_common/linked-account/linked-account.model';
import AppLinkedAccount from '../../../../../../../_common/linked-account/linked-account.vue';
import { LinkedAccounts } from '../../../../../../../_common/linked-account/linked-accounts.service';
import { ModalConfirm } from '../../../../../../../_common/modal/confirm/confirm-service';
import {
	BaseRouteComponent,
	OptionsForRoute,
} from '../../../../../../../_common/route/route-component';
import { useGameDashRouteController } from '../../manage.store';

@Options({
	name: 'RouteDashGamesManageGameLinkedAccounts',
	components: {
		AppLinkedAccount,
	},
})
@OptionsForRoute({
	deps: {},
	resolver: ({ route }) =>
		Api.sendRequest('/web/dash/linked-accounts?resource=Game&resourceId=' + route.params.id),
})
export default class RouteDashGamesManageGameLinkedAccounts extends BaseRouteComponent {
	routeStore = setup(() => useGameDashRouteController()!);

	get game() {
		return this.routeStore.game!;
	}

	accounts: LinkedAccount[] = [];
	loading = false;

	get routeTitle() {
		if (this.game) {
			return this.$gettextInterpolate('Edit Linked Accounts for %{ game }', {
				game: this.game.title,
			});
		}
		return null;
	}

	get twitterAccount() {
		return this.getAccount(LinkedAccount.PROVIDER_TWITTER);
	}

	get facebookAccount() {
		return this.getAccount(LinkedAccount.PROVIDER_FACEBOOK);
	}

	get tumblrAccount() {
		return this.getAccount(LinkedAccount.PROVIDER_TUMBLR);
	}

	get discordAccount() {
		return this.getAccount(LinkedAccount.PROVIDER_DISCORD);
	}

	routeResolved($payload: any) {
		this.accounts = LinkedAccount.populate($payload.accounts);
	}

	getAccount(provider: string) {
		if (this.accounts) {
			for (const account of this.accounts) {
				if (account.provider === provider) {
					return account;
				}
			}
		}
		return null;
	}

	async onLink(provider: Provider) {
		this.loading = true;
		await LinkedAccounts.link(
			this.$router,
			provider,
			'/web/dash/linked-accounts/link/',
			'Game',
			this.game.id
		);
	}

	async onUnlink(provider: Provider) {
		this.loading = true;

		if (
			provider === LinkedAccount.PROVIDER_FACEBOOK &&
			this.facebookAccount &&
			this.facebookAccount.facebookSelectedPage
		) {
			const confirmRemoval = await ModalConfirm.show(
				this.$gettextInterpolate(
					'Do you really want to unlink your Facebook account? Your Facebook Page "%{ title }" will also be unlinked in the process.',
					{
						title: this.facebookAccount.facebookSelectedPage.name,
					}
				)
			);
			if (!confirmRemoval) {
				this.loading = false;
				return;
			}
		} else if (
			provider === LinkedAccount.PROVIDER_TUMBLR &&
			this.tumblrAccount &&
			this.tumblrAccount.tumblrSelectedBlog
		) {
			const confirmRemoval = await ModalConfirm.show(
				this.$gettextInterpolate(
					'Do you really want to unlink your Tumblr account? Your Tumblr Blog "%{ title }" will also be unlinked in the process.',
					{
						title: this.tumblrAccount.tumblrSelectedBlog.title,
					}
				)
			);
			if (!confirmRemoval) {
				this.loading = false;
				return;
			}
		}

		const response = await Api.sendRequest(
			'/web/dash/linked-accounts/unlink/' +
				provider +
				'?resource=Game&resourceId=' +
				this.game.id,
			{}
		);

		const providerName = getLinkedAccountProviderDisplayName(provider);
		if (response.success) {
			this.accounts = LinkedAccount.populate(response.accounts);
			showSuccessGrowl(
				this.$gettextInterpolate(
					`Your %{ provider } account has been unlinked from %{ game }.`,
					{
						provider: providerName,
						game: this.game.title,
					}
				),
				this.$gettext('Account Unlinked')
			);
		} else {
			showErrorGrowl(
				this.$gettextInterpolate(`Could not unlink your %{ provider } account.`, {
					provider: providerName,
				})
			);
		}
		this.loading = false;
	}

	async onSelectFacebookPage() {
		if (!this.facebookAccount) {
			return;
		}

		const modalResult = await ModalFacebookPageSelector.show(
			this.$gettext('Select a page you want to post to with this account'),
			this.facebookAccount,
			this.$gettext('Select Facebook Page')
		);

		if (modalResult) {
			// do not send if the page was already selected
			// check id AND name to make sure they didn't change the name and want to sync it
			if (
				this.facebookAccount.facebookSelectedPage &&
				modalResult.id === this.facebookAccount.facebookSelectedPage.id &&
				modalResult.name === this.facebookAccount.facebookSelectedPage.name
			) {
				return;
			}

			const payload = await Api.sendRequest(
				'/web/dash/linked-accounts/link-facebook-page/' +
					this.game.id +
					'/' +
					this.facebookAccount.id +
					'/' +
					modalResult.id,
				{}
			);

			if (payload.success) {
				if (payload.accounts) {
					// update accounts
					this.accounts = LinkedAccount.populate(payload.accounts);
				}

				showSuccessGrowl(
					this.$gettextInterpolate('Changed the selected Facebook page to %{ title }.', {
						title: modalResult.name,
					}),
					this.$gettext('Select Facebook Page')
				);
			} else {
				showErrorGrowl(
					this.$gettext(
						'Failed to change to new Facebook page. Try to Sync your Facebook account.'
					)
				);
			}
		}
	}

	async onUnlinkFacebookPage() {
		if (!this.facebookAccount || !this.facebookAccount.facebookSelectedPage) {
			return;
		}

		const tempPageName = this.facebookAccount.facebookSelectedPage.name;

		const payload = await Api.sendRequest(
			'/web/dash/linked-accounts/unlink-facebook-page/' +
				this.game.id +
				'/' +
				this.facebookAccount.id,
			{}
		);

		if (payload.success) {
			if (payload.accounts) {
				// update accounts
				this.accounts = LinkedAccount.populate(payload.accounts);
			}

			showSuccessGrowl(
				this.$gettextInterpolate(
					`The Facebook Page %{ title } has been unlinked from %{ game }.`,
					{
						title: tempPageName,
						game: this.game.title,
					}
				),
				this.$gettext('Facebook Page Unlinked')
			);
		} else {
			showErrorGrowl(this.$gettext(`Could not unlink your Facebook page.`));
		}
	}

	async onLinkTumblrBlog(tumblrBlog: TumblrBlog) {
		if (!this.tumblrAccount) {
			return;
		}

		this.loading = true;

		const payload = await Api.sendRequest(
			'/web/dash/linked-accounts/link-tumblr-blog/' +
				this.tumblrAccount.id +
				'/' +
				tumblrBlog.name +
				'?resource=Game&resourceId=' +
				this.game.id,
			{}
		);

		if (payload.success) {
			if (payload.accounts) {
				// update accounts
				this.accounts = LinkedAccount.populate(payload.accounts);
			}

			showSuccessGrowl(
				this.$gettextInterpolate('Changed the selected Tumblr blog to %{ title }.', {
					title: tumblrBlog.title,
				}),
				this.$gettext('Tumblr Blog Changed')
			);
		} else {
			showErrorGrowl(
				this.$gettext(
					'Failed to change to new Tumblr blog. Maybe try to sync your Tumblr account.'
				)
			);
		}

		this.loading = false;
	}

	async onUnlinkTumblrBlog() {
		if (!this.tumblrAccount || !this.tumblrAccount.tumblrSelectedBlog) {
			return;
		}

		this.loading = true;

		const tempBlogTitle = this.tumblrAccount.tumblrSelectedBlog.title;

		const payload = await Api.sendRequest(
			'/web/dash/linked-accounts/unlink-tumblr-blog/' +
				this.tumblrAccount.id +
				'?resource=Game&resourceId=' +
				this.game.id,
			{}
		);

		if (payload.success) {
			if (payload.accounts) {
				// update accounts
				this.accounts = LinkedAccount.populate(payload.accounts);
			}

			showSuccessGrowl(
				this.$gettextInterpolate(
					`The Tumblr Blog %{ title } has been unlinked from %{ game }.`,
					{
						title: tempBlogTitle,
						game: this.game.title,
					}
				),
				this.$gettext('Tumblr Blog Unlinked')
			);
		} else {
			showErrorGrowl(this.$gettext(`Could not unlink your Tumblr Blog.`));
		}

		this.loading = false;
	}
}
</script>

<template>
	<div>
		<div class="row">
			<!--
		<div class="col-md-8 col-lg-6">
			<AppLinkedAccount
				provider="facebook"
				:account="facebookAccount"
				@sync="onLink"
				@link="onLink"
				@unlink="onUnlink">
				<div v-if="facebookAccount" class="-facebook-page">
					<h5>
						<AppTranslate>Linked Page</AppTranslate>
					</h5>
					<template v-if="facebookAccount.facebookSelectedPage">
						<p>
							<strong>
								<a :href="facebookAccount.facebookPageUrl" target="_blank">
									{{ facebookAccount.facebookSelectedPage.name }}
								</a>
							</strong>
						</p>
						<AppButton
							@click="onSelectFacebookPage">
							<AppTranslate>Change</AppTranslate>
						</AppButton>
						<AppButton
							v-if="facebookAccount.facebookSelectedPage"
							@click="onUnlinkFacebookPage"
							trans>
							<AppTranslate>Unlink</AppTranslate>
						</AppButton>
					</template>
					<template v-else>
						<p>
							<small class="text-muted"><AppTranslate>Not linked.</AppTranslate></small>
						</p>
						<AppButton
							@click="onSelectFacebookPage"
							icon="link">
							<AppTranslate>Link Now</AppTranslate>
						</AppButton>
					</template>
				</div>
			</AppLinkedAccount>
		</div>
		-->
			<div class="col-md-8 col-lg-6">
				<AppLinkedAccount
					provider="twitter"
					:account="twitterAccount"
					:disabled="loading"
					@sync="onLink"
					@link="onLink"
					@unlink="onUnlink"
				/>
			</div>

			<!--
		<div class="col-md-8 col-lg-6">
			<AppLinkedAccount
				provider="discord"
				:account="discordAccount"
				@sync="onLink"
				@link="onLink"
				@unlink="onUnlink" />
		</div>
		-->
			<div class="col-md-8 col-lg-6">
				<AppLinkedAccount
					provider="tumblr"
					:account="tumblrAccount"
					:disabled="loading"
					show-tumblr-blog
					@sync="onLink"
					@link="onLink"
					@unlink="onUnlink"
					@link-tumblr-blog="onLinkTumblrBlog"
					@unlink-tumblr-blog="onUnlinkTumblrBlog"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="stylus" scoped>
.-facebook-page
	> h5
		margin-top: 20px
		margin-bottom: 0
		font-weight: bold
</style>

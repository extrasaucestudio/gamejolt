<script lang="ts">
import { Options } from 'vue-property-decorator';
import { RouteLocationRedirect } from '../../../../utils/router';
import AppAuthLogin from '../../../../_common/auth/login/login.vue';
import { showErrorGrowl } from '../../../../_common/growls/growls.service';
import { BaseRouteComponent, OptionsForRoute } from '../../../../_common/route/route-component';
import { $gettext } from '../../../../_common/translate/translate.service';
import { loggedUserBlock } from '../RouteAuth.vue';

@Options({
	name: 'RouteAuthLogin',
	components: {
		AppAuthLogin,
	},
})
@OptionsForRoute({
	deps: { query: ['intent'] },
	async resolver({ route }) {
		if (route.query.intent === 'approve-login-expired') {
			showErrorGrowl({
				sticky: true,
				message: $gettext('This login attempt has expired. Try again.'),
			});
			return RouteLocationRedirect.fromRoute(route, {}, { intent: undefined });
		}

		return loggedUserBlock();
	},
})
export default class RouteAuthLogin extends BaseRouteComponent {
	redirect = '';

	get routeTitle() {
		return this.$gettext('Log in to Game Jolt');
	}

	routeCreated() {
		this.redirect = (this.$route.query.redirect as string) || '';
	}
}
</script>

<template>
	<div>
		<AppAuthLogin overlay :redirect-to="redirect" />

		<div class="auth-page-links text-right anim-fade-in">
			<div class="auth-page-link">
				<router-link :to="{ name: 'auth.forgot' }">
					<AppTranslate>Having trouble logging in?</AppTranslate>
				</router-link>
			</div>
			<div class="auth-page-link">
				Don't have an account?
				<router-link :to="{ name: 'auth.join' }">
					<AppTranslate>Sign up!</AppTranslate>
				</router-link>
			</div>
		</div>
	</div>
</template>

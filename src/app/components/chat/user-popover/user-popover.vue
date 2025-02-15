<script lang="ts">
import { Inject, Options, Prop, Vue } from 'vue-property-decorator';
import { Api } from '../../../../_common/api/api.service';
import { showSuccessGrowl } from '../../../../_common/growls/growls.service';
import { ModalConfirm } from '../../../../_common/modal/confirm/confirm-service';
import AppTheme from '../../../../_common/theme/AppTheme.vue';
import AppUserAvatar from '../../../../_common/user/user-avatar/user-avatar.vue';
import AppUserVerifiedTick from '../../../../_common/user/verified-tick/verified-tick.vue';
import { ChatStore, ChatStoreKey } from '../chat-store';
import {
	demoteModerator,
	enterChatRoom,
	isUserOnline,
	kickGroupMember,
	promoteToModerator,
	tryGetRoomRole,
	userCanModerateOtherUser,
} from '../client';
import { ChatRoom } from '../room';
import { ChatUser } from '../user';
import AppChatUserOnlineStatus from '../user-online-status/AppChatUserOnlineStatus.vue';

@Options({
	components: {
		AppChatUserOnlineStatus,
		AppUserAvatar,
		AppTheme,
		AppUserVerifiedTick,
	},
})
export default class AppChatUserPopover extends Vue {
	@Prop({ type: Object, required: true }) user!: ChatUser;
	@Prop({ type: Object, required: true }) room!: ChatRoom;

	@Inject({ from: ChatStoreKey })
	chatStore!: ChatStore;

	get chat() {
		return this.chatStore.chat!;
	}

	get isOnline() {
		if (!this.chatStore.chat) {
			return null;
		}

		return isUserOnline(this.chat, this.user.id);
	}

	get isOwner() {
		return this.room.owner_id === this.user.id;
	}

	get isModerator() {
		const role = tryGetRoomRole(this.chat, this.room, this.user);
		return role === 'moderator';
	}

	get canMessage() {
		// Don't show "Send message" link when already in PM room with the user.
		if (this.room.isPmRoom) {
			return false;
		}

		// Show when users are friends.
		return this.chat.friendsList.get(this.user) !== undefined;
	}

	get canModerate() {
		if (!this.chat || !this.chat.currentUser) {
			return false;
		}

		return userCanModerateOtherUser(this.chat, this.room, this.chat.currentUser, this.user);
	}

	get canChangeModerator() {
		if (!this.chat.currentUser) {
			return false;
		}
		if (!this.room.canElectModerators) {
			return false;
		}

		// In public rooms, staff members cannot lose their mod status.
		if (!this.room.isPrivateRoom && this.user.permission_level > 0) {
			return false;
		}

		// Only the owner of the room can promote/demote moderators.
		return this.chat.currentUser.id === this.room.owner_id;
	}

	get canKick() {
		// Cannot kick one of your mods, gotta demote first.
		if (this.isModerator) {
			return false;
		}

		// In public rooms, staff members can never get kicked.
		if (!this.room.isPrivateRoom && this.user.permission_level > 0) {
			return false;
		}

		return true;
	}

	onClickSendMessage() {
		const friend = this.chat.friendsList.get(this.user);
		if (friend) {
			enterChatRoom(this.chat, friend.room_id);
		}
	}

	async onClickKick() {
		const message = this.canMessage
			? this.$gettextInterpolate(
					`Are you sure you want to kick @%{ username } from this room?`,
					{ username: this.user.username }
			  )
			: this.$gettextInterpolate(
					`Are you sure you want to kick @%{ username } from this room? You're not friends with this user, so you won't be able to invite them back into this room.`,
					{ username: this.user.username }
			  );
		const confirm = await ModalConfirm.show(
			message,
			this.$gettextInterpolate(`Kick @%{ username }`, { username: this.user.username })
		);

		if (confirm) {
			kickGroupMember(this.chat, this.room, this.user.id);
		}
	}

	async onClickPromoteModerator() {
		const result = await ModalConfirm.show(
			this.$gettextInterpolate(
				`Do you want to promote @%{ username } to Moderator? They will be able to remove messages and kick users from the chat. You can demote them at any time.`,
				{ username: this.user.username }
			)
		);

		if (result) {
			if (this.chat.roomMembers[this.room.id].has(this.user)) {
				promoteToModerator(this.chat, this.room, this.user.id);
			} else if (this.room.type === 'fireside_group') {
				const payload = await Api.sendRequest(
					`/web/dash/fireside/chat/promote-moderator/${this.room.id}/${this.user.id}`,
					{}
				);
				if (payload.success && payload.role) {
					showSuccessGrowl(
						this.$gettextInterpolate(
							`@%{ username } has been promoted to Moderator. Refresh the page to see changes.`,
							{ username: this.user.username }
						)
					);
				}
			}
		}
	}

	async onClickDemoteModerator() {
		const result = await ModalConfirm.show(
			this.$gettextInterpolate(`Do you want to demote @%{ username } to User?`, {
				username: this.user.username,
			})
		);

		if (result) {
			if (this.chat.roomMembers[this.room.id].has(this.user)) {
				demoteModerator(this.chat, this.room, this.user.id);
			} else if (this.room.type === 'fireside_group') {
				const payload = await Api.sendRequest(
					`/web/dash/fireside/chat/demote-moderator/${this.room.id}/${this.user.id}`,
					{}
				);
				if (payload.success && payload.role) {
					showSuccessGrowl(
						this.$gettextInterpolate(
							`@%{ username } has been demoted to User. Refresh the page to see changes.`,
							{ username: this.user.username }
						)
					);
				}
			}
		}
	}
}
</script>

<template>
	<div class="chat-user-popover">
		<div class="fill-darker -info-container">
			<div class="-avatar-container">
				<div class="-avatar-img">
					<AppUserAvatar class="-avatar" :user="user" />
					<div class="-avatar-circle" />
				</div>
			</div>

			<div class="-names">
				<div class="-displayname">
					<b>{{ user.display_name }}</b>
					<AppUserVerifiedTick class="-verified-icon" :user="user" />
				</div>
				<div class="-username text-muted">@{{ user.username }}</div>
			</div>

			<div v-if="isOnline !== null" class="-status">
				<AppChatUserOnlineStatus
					class="-status-bubble"
					:is-online="isOnline"
					:size="12"
					:segment-width="1.5"
				/>
				<span>{{ isOnline ? $gettext(`Online`) : $gettext(`Offline`) }}</span>
			</div>

			<div v-if="isOwner" class="-status">
				<AppJolticon class="-status-icon" icon="crown" />
				&nbsp;
				<AppTranslate>Room Owner</AppTranslate>
			</div>
			<div v-else-if="isModerator" class="-status">
				<AppJolticon class="-status-icon" icon="star" />
				&nbsp;
				<AppTranslate>Moderator</AppTranslate>
			</div>
		</div>
		<div class="list-group list-group-dark">
			<router-link
				:to="{ name: 'profile.overview', params: { username: user.username } }"
				class="list-group-item has-icon"
			>
				<AppJolticon icon="user" />
				<AppTranslate>View Profile</AppTranslate>
			</router-link>
			<a v-if="canMessage" class="list-group-item has-icon" @click="onClickSendMessage">
				<AppJolticon icon="message" />
				<AppTranslate>Send Message</AppTranslate>
			</a>
			<template v-if="canModerate">
				<template v-if="canChangeModerator">
					<hr />
					<template v-if="!isModerator">
						<a class="list-group-item has-icon" @click="onClickPromoteModerator">
							<AppJolticon icon="star" />
							<AppTranslate>Promote to Moderator</AppTranslate>
						</a>
					</template>
					<template v-else>
						<a class="list-group-item has-icon" @click="onClickDemoteModerator">
							<AppJolticon icon="remove" notice />
							<AppTranslate>Demote Moderator</AppTranslate>
						</a>
					</template>
				</template>

				<template v-if="canKick">
					<hr />
					<a class="list-group-item has-icon" @click="onClickKick">
						<AppJolticon icon="logout" notice />
						<AppTranslate>Kick from Room</AppTranslate>
					</a>
				</template>
			</template>
		</div>
	</div>
</template>

<style lang="stylus" scoped>
.chat-user-popover
	.-info-container
		padding: 16px
		border-bottom-width: $border-width-large
		border-bottom-style: solid
		border-bottom-color: var(--theme-darkest)
		width: 250px

	.-names
		margin-top: 4px
		text-align: center

		.-displayname
			.-verified-icon
				vertical-align: middle

	.-username
		font-size: $font-size-small

	.-avatar
		width: 72px
		height: 72px
		z-index: 2
		transition: filter 0.1s ease

		&:hover
			filter: brightness(0.6) contrast(1.1)

	.-avatar-circle
		width: 80px
		height: 80px
		top: -4px
		left: -4px
		position: absolute
		z-index: 1
		border-radius: 50%
		background-color: var(--theme-darkest)

	.-avatar-img
		position: relative
		border-radius: 50%

		&:hover
			elevate-hover-2()

	.-avatar-container
		display: flex
		justify-content: center
		margin-bottom: 10px

	.-status
		margin-top: 8px
		display: flex
		font-family: $font-family-tiny
		font-size: $font-size-tiny
		font-weight: bold
		justify-content: center
		align-items: center
		user-select: none
		line-height: 1

	.-status-icon
		vertical-align: middle

	.-status-bubble
		margin-right: 4px
		height: 100%
</style>

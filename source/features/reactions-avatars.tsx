import './reactions-avatars.css';
import React from 'dom-chef';
import select from 'select-dom';
import features from '../libs/features';
import {getUsername, flatZip} from '../libs/utils';
import onUpdatableContentUpdate from '../libs/on-updatable-content-update';

const arbitraryAvatarLimit = 36;
const approximateHeaderLength = 3; // Each button header takes about as much as 3 avatars

const isFirefox = navigator.userAgent.includes('Firefox/');

type Participant = {
	container: HTMLElement;
	username: string;
	imageUrl: string;
};

function getParticipants(container: HTMLElement): Participant[] {
	const currentUser = getUsername();
	const users = container.getAttribute('aria-label')!
		.replace(/ reacted with.*/, '')
		.replace(/,? and /, ', ')
		.replace(/, \d+ more/, '')
		.split(', ');

	const participants = [];
	for (const username of users) {
		if (username === currentUser) {
			continue;
		}

		const cleanName = username.replace('[bot]', '');

		// Find image on page. Saves a request and a redirect + add support for bots
		const existingAvatar = select<HTMLImageElement>(`[alt="@${cleanName}"]`);
		if (existingAvatar) {
			participants.push({container, username, imageUrl: existingAvatar.src});
			continue;
		}

		// If it's not a bot, use a shortcut URL #2125
		if (cleanName === username) {
			const imageUrl = `/${username}.png?size=${window.devicePixelRatio * 20}`;
			participants.push({container, username, imageUrl});
		}
	}

	return participants;
}

function init(): void {
	for (const list of select.all('.has-reactions .comment-reactions-options:not(.rgh-reactions)')) {
		const avatarLimit = arbitraryAvatarLimit - (list.children.length * approximateHeaderLength);

		const participantByReaction = [...list.children as HTMLCollectionOf<HTMLElement>].map(getParticipants);
		const flatParticipants = flatZip(participantByReaction, avatarLimit);

		for (const {container, username, imageUrl} of flatParticipants) {
			container.append(
				// Without this, Firefox will follow the link instead of submitting the reaction button
				<a href={isFirefox ? undefined : `/${username}`}>
					<img src={imageUrl} />
				</a>
			);
		}

		list.classList.add('rgh-reactions');

		// Overlap reaction avatars when near the avatarLimit
		if (flatParticipants.length > avatarLimit * 0.9) {
			list.classList.add('rgh-reactions-near-limit');
		}

		onUpdatableContentUpdate(list.closest<HTMLElement>('.js-updatable-content')!, init);
	}
}

features.add({
	id: __featureName__,
	description: 'Adds reaction avatars showing *who* reacted to a comment',
	screenshot: 'https://user-images.githubusercontent.com/1402241/34438653-f66535a4-ecda-11e7-9406-2e1258050cfa.png',
	include: [
		features.hasComments
	],
	load: features.onNewComments,
	init
});

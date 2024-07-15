const APIController = (() => {
    const clientId = 'f4862ab9d5f24a1f8342245fc3e51a8a';
    const clientSecret = '15ae5544a1c44d5caabb8a5f248bf056';

    const _getToken = async () => {
        const result = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`)
            },
            body: 'grant_type=client_credentials'
        });

        const data = await result.json();
        return data.access_token;
    };

    const _fetchData = async (url, token) => {
        const result = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token }
        });

        return result.json();
    };

    return {
        getToken: () => _getToken(),
        search: (token, query, type) => _fetchData(`https://api.spotify.com/v1/search?q=${query}&type=${type}&limit=20`, token),
        getGenres: (token) => _fetchData('https://api.spotify.com/v1/browse/categories?locale=sv_US', token).then(data => data.categories.items),
        getPlaylistByGenre: (token, genreId) => _fetchData(`https://api.spotify.com/v1/browse/categories/${genreId}/playlists?limit=20`, token).then(data => data.playlists.items),
        getTracks: (token, tracksEndPoint) => _fetchData(`${tracksEndPoint}?limit=20`, token).then(data => data.items),
        getRecommendations: (token, seed_tracks) => _fetchData(`https://api.spotify.com/v1/recommendations?seed_tracks=${seed_tracks}&limit=20`, token).then(data => data.tracks)
    };
})();

const UIController = (() => {
    const DOMElements = {
        divSongDetail: '#song-detail',
        divSonglist: '.song-list',
        divRecommendedList: '.recommended-list',
        inputSearch: '#input_search',
        buttonSearch: '#btn_search',
        selectGenre: '#select_genre',
        selectPlaylist: '#select_playlist',
        buttonSubmitGenre: '#btn_submit_genre',
        buttonSubmitPlaylist: '#btn_submit_playlist',
        hfToken: '#hidden_token'
    };

    const _insertHTML = (selector, html) => {
        document.querySelector(selector).insertAdjacentHTML('beforeend', html);
    };

    const _playAudio = (preview_url, img, name, artist) => {
        const detailDiv = document.querySelector(DOMElements.divSongDetail);
        detailDiv.innerHTML = `
            <img src="${img}" alt="Track Image">
            <h3>${name}</h3>
            <p>${artist}</p>
            <audio controls>
                <source src="${preview_url}" type="audio/mpeg">
                Your browser does not support the audio element.
            </audio>`;
        detailDiv.querySelector('audio').play();
    };

    return {
        inputField: () => ({
            search: document.querySelector(DOMElements.inputSearch),
            searchButton: document.querySelector(DOMElements.buttonSearch),
            genre: document.querySelector(DOMElements.selectGenre),
            playlist: document.querySelector(DOMElements.selectPlaylist),
            submitGenre: document.querySelector(DOMElements.buttonSubmitGenre),
            submitPlaylist: document.querySelector(DOMElements.buttonSubmitPlaylist)
        }),
        createTrack: ({ id, name, artist, img, preview_url }) => {
            const html = `
                <div class="track-item">
                    <img src="${img}" alt="Track Image">
                    <h3>${name}</h3>
                    <p>${artist}</p>
                    <button onclick="UIController.playAudio('${preview_url}', '${img}', '${name}', '${artist}')">PLAY</button>
                </div>`;
            _insertHTML(DOMElements.divSonglist, html);
        },
        createRecommendedTrack: ({ id, name, artist, img, preview_url }) => {
            const html = `
                <div class="track-item">
                    <img src="${img}" alt="Track Image">
                    <h3>${name}</h3>
                    <p>${artist}</p>
                    <button onclick="UIController.playAudio('${preview_url}', '${img}', '${name}', '${artist}')">PLAY</button>
                </div>`;
            _insertHTML(DOMElements.divRecommendedList, html);
        },
        createGenre: ({ text, value }) => {
            const html = `<option value="${value}">${text}</option>`;
            _insertHTML(DOMElements.selectGenre, html);
        },
        createPlaylist: ({ text, value }) => {
            const html = `<option value="${value}">${text}</option>`;
            _insertHTML(DOMElements.selectPlaylist, html);
        },
        resetTrackDetail: () => {
            document.querySelector(DOMElements.divSongDetail).innerHTML = '';
        },
        resetTracks: () => {
            document.querySelector(DOMElements.divSonglist).innerHTML = '';
        },
        resetRecommendations: () => {
            document.querySelector(DOMElements.divRecommendedList).innerHTML = '';
        },
        resetPlaylist: () => {
            document.querySelector(DOMElements.selectPlaylist).innerHTML = '';
            UIController.resetTracks();
        },
        storeToken: (value) => {
            document.querySelector(DOMElements.hfToken).value = value;
        },
        getStoredToken: () => ({
            token: document.querySelector(DOMElements.hfToken).value
        }),
        playAudio: (preview_url, img, name, artist) => {
            _playAudio(preview_url, img, name, artist);
        }
    };
})();

const APPController = ((UICtrl, APICtrl) => {
    const DOMInputs = UICtrl.inputField();
    const defaultSeedTrackId = '3n3Ppam7vgaVa1iaRUc9Lp';

    const loadGenres = async () => {
        const token = await APICtrl.getToken();
        UICtrl.storeToken(token);

        const genres = await APICtrl.getGenres(token);
        genres.forEach(genre => UICtrl.createGenre({ text: genre.name, value: genre.id }));
    };

    const loadRecommendations = async (token, seedTrackId) => {
        const recommendations = await APICtrl.getRecommendations(token, seedTrackId);
        UICtrl.resetRecommendations();
        recommendations.forEach(track => {
            UICtrl.createRecommendedTrack({
                id: track.id,
                name: track.name,
                artist: track.artists[0].name,
                img: track.album.images[0].url,
                preview_url: track.preview_url
            });
        });
    };

    DOMInputs.submitGenre.addEventListener('click', async () => {
        UICtrl.resetTrackDetail();
        const token = UICtrl.getStoredToken().token;
        const genreId = DOMInputs.genre.value;
        const playlists = await APICtrl.getPlaylistByGenre(token, genreId);
        UICtrl.resetPlaylist();
        playlists.forEach(p => UICtrl.createPlaylist({ text: p.name, value: p.tracks.href }));
    });

    DOMInputs.submitPlaylist.addEventListener('click', async () => {
        UICtrl.resetTrackDetail();
        const token = UICtrl.getStoredToken().token;
        const tracksEndPoint = DOMInputs.playlist.value;
        const tracks = await APICtrl.getTracks(token, tracksEndPoint);
        UICtrl.resetTracks();
        tracks.forEach(el => UICtrl.createTrack({
            id: el.track.id,
            name: el.track.name,
            artist: el.track.artists[0].name,
            img: el.track.album.images[0].url,
            preview_url: el.track.preview_url
        }));
    });

    DOMInputs.searchButton.addEventListener('click', async (e) => {
        e.preventDefault();
        UICtrl.resetTrackDetail();
        const token = UICtrl.getStoredToken().token;
        const query = DOMInputs.search.value;
        const data = await APICtrl.search(token, query, 'track,artist,album');

        UICtrl.resetTracks();
        UICtrl.resetRecommendations();

        if (data.tracks.items.length > 0) {
            data.tracks.items.forEach(track => {
                UICtrl.createTrack({
                    id: track.id,
                    name: track.name,
                    artist: track.artists[0].name,
                    img: track.album.images[0].url,
                    preview_url: track.preview_url
                });
            });

            const recommendations = await APICtrl.getRecommendations(token, data.tracks.items[0].id);
            recommendations.forEach(track => {
                UICtrl.createRecommendedTrack({
                    id: track.id,
                    name: track.name,
                    artist: track.artists[0].name,
                    img: track.album.images[0].url,
                    preview_url: track.preview_url
                });
            });
        }
    });

    return {
        async init() {
            console.log('App is starting');
            await loadGenres();
            const token = await APICtrl.getToken();
            UICtrl.storeToken(token);
            await loadRecommendations(token, defaultSeedTrackId);
        }
    };
})(UIController, APIController);

APPController.init();

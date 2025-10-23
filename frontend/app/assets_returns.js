const assetsContext = require.context('../assets', false, /\.(png|jpe?g|svg|gif)$/);

export function getAsset(asset) {
    return assetsContext(`./${asset}`);
}
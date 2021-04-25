import * as L from 'leaflet';

export const PropertiesButton = L.Control.extend({
    onAdd(map: L.Map): HTMLElement {
        const button = L.DomUtil.create('button');

        button.innerHTML = '&equiv;';
        button.classList.add('btn', 'btn-light');
        button.setAttribute('type', 'button');
        button.setAttribute('data-bs-toggle', 'offcanvas');
        button.setAttribute('data-bs-target', '#image-properties');

        return button;
    },

    onRemove(map: any): any {}
});

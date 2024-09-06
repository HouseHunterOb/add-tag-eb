const axios = require('axios');
const chalk = require('chalk');
require('dotenv').config();

const API_KEY = process.env.EASYBROKER_API_KEY;
const LISTING_STATUS_URL = 'https://api.easybroker.com/v1/listing_statuses';
const PROPERTY_DETAILS_URL = 'https://api.easybroker.com/v1/properties/';
const UPDATE_PROPERTY_URL = 'https://api.easybroker.com/v1/properties/';

// Función para obtener todos los estados de las propiedades con paginación
async function getAllPropertyListingStatuses() {
  let allStatuses = [];
  let currentPage = 1;
  let hasMorePages = true;

  try {
    // Hacemos solicitudes hasta que no haya más páginas
    while (hasMorePages) {
      const response = await axios.get(`${LISTING_STATUS_URL}?limit=100&page=${currentPage}`, {
        headers: {
          'X-Authorization': API_KEY,
          'Accept': 'application/json'
        }
      });

      // Concatenamos los resultados de la página actual a la lista total
      allStatuses = allStatuses.concat(response.data.content);

      // Si hay una página siguiente, continuamos, si no, terminamos el ciclo
      hasMorePages = response.data.pagination.next_page !== null;
      currentPage++;
    }

    return allStatuses;
  } catch (err) {
    console.error(chalk.red('Error fetching property statuses:'), err.message);
    return [];
  }
}

// Función para obtener los detalles de una propiedad (incluyendo los tags)
async function getPropertyDetails(propertyId) {
  try {
    const response = await axios.get(`${PROPERTY_DETAILS_URL}${propertyId}`, {
      headers: {
        'X-Authorization': API_KEY,
        'Accept': 'application/json'
      }
    });
    return response.data;
  } catch (err) {
    console.error(chalk.red(`Error fetching details for property ID ${propertyId}:`), err.message);
    return null;
  }
}

// Función para agregar la etiqueta "Meta" a una propiedad
async function addMetaTagToProperty(propertyId, currentTags) {
  try {
    const updatedTags = [...currentTags, 'Meta']; // Agregamos la etiqueta "Meta"
    await axios.patch(`${UPDATE_PROPERTY_URL}${propertyId}`, {
      tags: updatedTags
    }, {
      headers: {
        'X-Authorization': API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    console.log(chalk.green(`Etiqueta "Meta" agregada a la propiedad ${propertyId}.`));
  } catch (err) {
    console.error(chalk.red(`Error al agregar la etiqueta "Meta" a la propiedad ${propertyId}:`), err.message);
  }
}

// Función principal para verificar las propiedades publicadas y agregar la etiqueta "Meta"
async function addMetaTagToPublishedProperties() {
  const propertyStatuses = await getAllPropertyListingStatuses(); // Obtenemos todos los estados de las propiedades

  if (propertyStatuses.length === 0) {
    console.log(chalk.red('No se encontraron propiedades.'));
    return;
  }

  // Filtramos las propiedades que están publicadas
  const publishedProperties = propertyStatuses.filter(property => property.status === 'published');

  // Recorremos todas las propiedades publicadas
  for (const property of publishedProperties) {
    const propertyDetails = await getPropertyDetails(property.public_id); // Obtenemos los detalles de la propiedad

    if (propertyDetails && propertyDetails.tags) {
      if (!propertyDetails.tags.includes('Meta')) {
        // Si la propiedad no tiene la etiqueta "Meta", la agregamos
        console.log(chalk.yellow(`La propiedad ${property.public_id} no tiene la etiqueta "Meta".`));
        await addMetaTagToProperty(property.public_id, propertyDetails.tags);
      } else {
        console.log(chalk.blue(`La propiedad ${property.public_id} ya tiene la etiqueta "Meta".`));
      }
    }
  }
}

// Ejecutamos la función para agregar la etiqueta "Meta" a las propiedades publicadas que no la tienen
addMetaTagToPublishedProperties();
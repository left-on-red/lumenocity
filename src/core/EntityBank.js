let Entity = require('./Entity.js');
let entities = [];

class EntityBank {
    /**
     * 
     * @param {Entity} entity 
     */
    static add(entity) {
        let index = entities.length;
        entities.push(entity);

        // removes the entity from the array when it's destroyed
        entities[index].on('destroy', function() { entities.splice(entities.indexOf(entity), 1) });
    }

    /**
     * @returns {Entity[]}
     */
    static entities() { return entities }
}

module.exports = EntityBank;
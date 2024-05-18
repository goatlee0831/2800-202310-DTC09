const UrgentCardContainer = document.getElementById('UrgentTasksCardContainer');
const InProgressCardContainer = document.getElementById('InProgressTasksCardContainer');
const RecommendedCardContainer = document.getElementById('RecommendedTasksCardContainer');

function createCard(title, content) {
    const card = document.createElement('div');
    card.classList.add('card');

    const cardTitle = document.createElement('h2');
    cardTitle.textContent = title;

    const cardContent = document.createElement('p');
    cardContent.textContent = content;

    card.appendChild(cardTitle);
    card.appendChild(cardContent);

    return card;
}

// Example usage
const card1 = createCard('Urgent Task 1', 'LOTS OF THINGS TO DO!');
const card2 = createCard('Urgent Task 2', 'LOTS OF MORE THINGS TO DO!');

// Adding the cards to the container
UrgentCardContainer.appendChild(card1);
UrgentCardContainer.appendChild(card2);
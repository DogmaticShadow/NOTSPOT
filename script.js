class ContactTracker {
    constructor() {
        this.people = JSON.parse(localStorage.getItem('contactTracker')) || [];
        this.init();
    }

    init() {
        this.renderTable();
        this.setupEventListeners();
        this.startStatusUpdater();
    }

    setupEventListeners() {
        const addBtn = document.getElementById('addPersonBtn');
        const modal = document.getElementById('addPersonModal');
        const closeBtn = document.querySelector('.close');
        const form = document.getElementById('addPersonForm');

        addBtn.addEventListener('click', () => {
            modal.style.display = 'block';
        });

        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addPerson();
        });
    }

    addPerson() {
        const name = document.getElementById('personName').value;
        const number = document.getElementById('personNumber').value;
        const birthday = document.getElementById('personBirthday').value;
        const frequency = parseInt(document.getElementById('personFrequency').value);
        const frequencyUnit = document.getElementById('frequencyUnit').value;

        const person = {
            id: Date.now(),
            name,
            number,
            birthday,
            frequency,
            frequencyUnit,
            lastContact: null,
            status: 'overdue'
        };

        this.people.push(person);
        this.saveData();
        this.renderTable();
        
        // Close modal and reset form
        document.getElementById('addPersonModal').style.display = 'none';
        document.getElementById('addPersonForm').reset();
    }

    markAsContacted(personId) {
        const person = this.people.find(p => p.id === personId);
        if (person) {
            person.lastContact = new Date().toISOString();
            person.status = 'recent';
            this.saveData();
            this.renderTable();
        }
    }

    updateStatuses() {
        const now = new Date();
        let updated = false;

        this.people.forEach(person => {
            if (person.lastContact) {
                const lastContactDate = new Date(person.lastContact);
                const timeSinceContact = now - lastContactDate;
                const frequencyInMs = this.getFrequencyInMs(person.frequency, person.frequencyUnit || 'days');
                
                if (timeSinceContact >= frequencyInMs && person.status === 'recent') {
                    person.status = 'overdue';
                    updated = true;
                }
            }
        });

        if (updated) {
            this.saveData();
            this.renderTable();
        }
    }

    getFrequencyInMs(frequency, unit) {
        const multipliers = {
            minutes: 1000 * 60,
            days: 1000 * 60 * 60 * 24,
            weeks: 1000 * 60 * 60 * 24 * 7,
            months: 1000 * 60 * 60 * 24 * 30
        };
        return frequency * multipliers[unit];
    }

    getStatusInfo(person) {
        if (!person.lastContact) {
            return {
                status: 'overdue',
                text: 'Never contacted',
                timeLeft: 0
            };
        }

        const now = new Date();
        const lastContactDate = new Date(person.lastContact);
        const timeSinceContact = now - lastContactDate;
        const frequencyInMs = this.getFrequencyInMs(person.frequency, person.frequencyUnit || 'days');
        const timeLeft = frequencyInMs - timeSinceContact;

        if (timeLeft > 0) {
            const timeLeftText = this.formatTimeRemaining(timeLeft, person.frequencyUnit || 'days');
            return {
                status: 'recent',
                text: `${timeLeftText} left`,
                timeLeft
            };
        } else {
            const overdue = Math.abs(timeLeft);
            const overdueText = this.formatTimeRemaining(overdue, person.frequencyUnit || 'days');
            return {
                status: 'overdue',
                text: `${overdueText} overdue`,
                timeLeft
            };
        }
    }

    formatTimeRemaining(ms, unit) {
        const minutes = Math.floor(ms / (1000 * 60));
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));
        const weeks = Math.floor(ms / (1000 * 60 * 60 * 24 * 7));
        const months = Math.floor(ms / (1000 * 60 * 60 * 24 * 30));

        switch(unit) {
            case 'minutes':
                return `${minutes} min`;
            case 'days':
                return `${days} day${days !== 1 ? 's' : ''}`;
            case 'weeks':
                return `${weeks} week${weeks !== 1 ? 's' : ''}`;
            case 'months':
                return `${months} month${months !== 1 ? 's' : ''}`;
            default:
                return `${days} day${days !== 1 ? 's' : ''}`;
        }
    }

    formatDate(dateString) {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString();
    }

    renderTable() {
        const tbody = document.getElementById('peopleTableBody');
        
        if (this.people.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <h3>No contacts yet</h3>
                        <p>Click "Add Person" to start tracking your connections</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.people.map(person => {
            const statusInfo = this.getStatusInfo(person);
            const lastContactText = person.lastContact ? 
                new Date(person.lastContact).toLocaleDateString() : 'Never';

            return `
                <tr class="person-row ${statusInfo.status}">
                    <td><strong>${person.name}</strong></td>
                    <td>${person.number || 'Not provided'}</td>
                    <td>${this.formatDate(person.birthday)}</td>
                    <td>Every ${person.frequency} ${person.frequencyUnit || 'days'}</td>
                    <td>${lastContactText}</td>
                    <td>
                        <span class="status-indicator status-${statusInfo.status}">
                            ${statusInfo.text}
                        </span>
                    </td>
                    <td>
                        <button class="contact-btn" onclick="contactTracker.markAsContacted(${person.id})">
                            ✓ Contacted
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    startStatusUpdater() {
        // Update statuses every minute
        setInterval(() => {
            this.updateStatuses();
        }, 60000);
        
        // Initial update
        this.updateStatuses();
    }

    saveData() {
        localStorage.setItem('contactTracker', JSON.stringify(this.people));
    }
}

// Initialize the app
const contactTracker = new ContactTracker();
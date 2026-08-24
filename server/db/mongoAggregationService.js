import { Event } from '../models/mongoEventModel.js';
import { Registration } from '../models/mongoRegistrationModel.js';

/**
 * MongoDB Aggregation Pipeline Service:
 * Demonstrates native MongoDB NoSQL document joins using $lookup, $group, $project.
 */
export const getEventsWithOrganizerMongoDB = async () => {
  try {
    // MongoDB Aggregation Pipeline ($lookup -> INNER JOIN equivalent in NoSQL)
    const result = await Event.aggregate([
      {
        $lookup: {
          from: 'registrations',
          localField: '_id',
          foreignField: 'eventId',
          as: 'registrationsList'
        }
      },
      {
        $project: {
          title: 1,
          city: 1,
          category: 1,
          capacity: 1,
          registeredCount: 1,
          organizerName: 1,
          totalBookedTickets: { $size: '$registrationsList' },
          seatsRemaining: { $subtract: ['$capacity', { $size: '$registrationsList' }] }
        }
      }
    ]).exec();

    return result;
  } catch (err) {
    console.warn('MongoDB Aggregation note:', err.message);
    return [];
  }
};

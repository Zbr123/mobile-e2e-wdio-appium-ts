import { assertNoGqlErrors, gql } from './http';

/**
 * Tests create the data they need through the BFF and delete it afterwards.
 * - Names carry a run id, so parallel runs and leftovers never collide.
 * - Cleanup runs in reverse order (appointment before pet) and never throws,
 *   so one failed delete can't mask the real test failure.
 * - Anything a crashed run leaves behind is prefixed `e2e-` for a nightly sweep.
 */
export const runId = (): string =>
  `${process.env.GITHUB_RUN_ID ?? 'local'}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export interface Pet {
  id: string;
  name: string;
}

export interface Appointment {
  id: string;
  startsAt: string;
  pet: Pet;
}

const CREATE_PET = /* GraphQL */ `
  mutation CreatePet($input: CreatePetInput!) {
    createPet(input: $input) { id name }
  }`;

const DELETE_PET = /* GraphQL */ `
  mutation DeletePet($id: ID!) { deletePet(id: $id) }`;

const BOOK_APPOINTMENT = /* GraphQL */ `
  mutation Book($input: BookAppointmentInput!) {
    bookAppointment(input: $input) { id startsAt pet { id name } }
  }`;

const CANCEL_APPOINTMENT = /* GraphQL */ `
  mutation Cancel($id: ID!) { cancelAppointment(id: $id) }`;

export class TestData {
  private readonly cleanups: Array<{ label: string; run: () => Promise<unknown> }> = [];

  constructor(private readonly token: string) {}

  async createPet(species: 'DOG' | 'CAT' = 'DOG'): Promise<Pet> {
    const name = `e2e-pet-${runId()}`;
    const res = await gql<{ createPet: Pet }>(CREATE_PET, { input: { name, species } }, this.token);
    const pet = assertNoGqlErrors(res, 'createPet').createPet;
    this.cleanups.push({ label: `pet ${pet.id}`, run: () => gql(DELETE_PET, { id: pet.id }, this.token) });
    return pet;
  }

  /** Books an appointment a few days ahead so it is always "upcoming", regardless of time zone. */
  async bookAppointment(pet: Pet, daysAhead = 3): Promise<Appointment> {
    const startsAt = new Date(Date.now() + daysAhead * 86_400_000);
    startsAt.setUTCHours(0, 0, 0, 0);
    const res = await gql<{ bookAppointment: Appointment }>(
      BOOK_APPOINTMENT,
      { input: { petId: pet.id, startsAt: startsAt.toISOString(), reason: 'e2e check-up' } },
      this.token,
    );
    const appt = assertNoGqlErrors(res, 'bookAppointment').bookAppointment;
    this.cleanups.push({
      label: `appointment ${appt.id}`,
      run: () => gql(CANCEL_APPOINTMENT, { id: appt.id }, this.token),
    });
    return appt;
  }

  async cleanup(): Promise<void> {
    while (this.cleanups.length) {
      const item = this.cleanups.pop()!;
      try {
        await item.run();
      } catch (err) {
        console.warn(`[testData] cleanup of ${item.label} failed: ${String(err)}`);
      }
    }
  }
}

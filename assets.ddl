/* assets.ddl */

/* facilities */
drop table facilities;
create table if not exists facilities ( id varchar(50) not null primary key, name text default '', asset_a_name text default '', asset_a_num int default 0, asset_b_name text default '', asset_b_num int default 0, created bigint default 0, updated bigint default 0 );

/* snapshots */
drop table snapshots;
create table if not exists snapshots ( id varchar(50) not null primary key, key varchar(50) not null, facility_id varchar(50) not null, asset_a_num int, asset_b_num int, memo text default '', created bigint default 0, updated bigint default 0 );
